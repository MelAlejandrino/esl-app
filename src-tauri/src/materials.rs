use crate::db::Db;
use crate::error::{AppError, Result};
use crate::search::{clause, patterns};
use rusqlite::{params, params_from_iter, Connection, Row};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri_plugin_opener::OpenerExt;

/// The only file types the library accepts. Anything else is rejected by name
/// so the teacher hears why instead of finding a broken row later.
const SUPPORTED: [&str; 14] = [
    "pdf", "docx", "pptx", "ppt", "xlsx", "xls", "png", "jpg", "jpeg", "webp", "mp3", "wav",
    "m4a", "mp4",
];

/// A web link is stored in the same `path` column as a file — `kind` is LINK and
/// anything starting http(s):// is treated as a URL rather than a disk path.
/// ponytail: no new column and no migration; the location column already holds a
/// location. Split it out only if links grow fields of their own.
pub const LINK: &str = "LINK";

/// Case-insensitive: this is the read-time discriminator as well as the import
/// check, so it must never disagree with what `add_link` decided to store.
pub fn is_url(s: &str) -> bool {
    let starts = |p: &str| s.get(..p.len()).is_some_and(|h| h.eq_ignore_ascii_case(p));
    starts("http://") || starts("https://")
}

/// "https://www.bbc.co.uk/learning?x=1" -> "bbc.co.uk" — the default name for a
/// link the teacher didn't bother naming.
/// ponytail: split on the delimiters instead of pulling in a URL crate; it only
/// has to produce a readable label, not parse the spec.
fn host_of(url: &str) -> &str {
    let rest = url.split_once("://").map(|(_, r)| r).unwrap_or(url);
    let authority = rest.split(['/', '?', '#']).next().unwrap_or(rest);
    // Everything before the last '@' is userinfo, not the site: naming
    // "https://bbc.co.uk@evil.example" after bbc.co.uk would be a lie.
    let host = authority.rsplit('@').next().unwrap_or(authority);
    host.strip_prefix("www.").unwrap_or(host)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Material {
    pub id: i64,
    pub name: String,
    pub path: String,
    pub kind: String,
    pub file_size: Option<i64>,
    pub folder_id: Option<i64>,
    pub folder_name: Option<String>,
    pub is_favorite: bool,
    pub created_at: String,
    pub updated_at: String,
    pub last_opened_at: Option<String>,
    pub tags: Vec<String>,
    /// Checked at read time, so a file moved outside the app shows as missing.
    /// Always true for a link — checking would mean a network request per row.
    pub exists: bool,
}

const COLS: &str = "m.id, m.name, m.path, m.kind, m.file_size, m.folder_id, f.name,
    m.is_favorite, m.created_at, m.updated_at, m.last_opened_at,
    (SELECT GROUP_CONCAT(t.name, char(31)) FROM material_tags mt JOIN tags t ON t.id = mt.tag_id
       WHERE mt.material_id = m.id)";

const FROM: &str = "FROM materials m LEFT JOIN folders f ON f.id = m.folder_id";

const UNIT_SEP: char = '\u{1f}';

fn map(r: &Row) -> rusqlite::Result<Material> {
    let path: String = r.get(2)?;
    let tags: Option<String> = r.get(11)?;
    Ok(Material {
        id: r.get(0)?,
        name: r.get(1)?,
        // ponytail: one stat() per row on read. Instant for a personal library;
        // move to a `notify` watcher if someone ever indexes 50k files.
        exists: is_url(&path) || Path::new(&path).exists(),
        path,
        kind: r.get(3)?,
        file_size: r.get(4)?,
        folder_id: r.get(5)?,
        folder_name: r.get(6)?,
        is_favorite: r.get(7)?,
        created_at: r.get(8)?,
        updated_at: r.get(9)?,
        last_opened_at: r.get(10)?,
        tags: tags
            .map(|s| s.split(UNIT_SEP).map(str::to_string).collect())
            .unwrap_or_default(),
    })
}

const SORTS: [(&str, &str); 4] = [
    ("name", "m.name COLLATE NOCASE"),
    ("recent", "m.last_opened_at DESC NULLS LAST, m.created_at DESC"),
    ("added", "m.created_at DESC"),
    ("kind", "m.kind, m.name COLLATE NOCASE"),
];

const SEARCHABLE: &str = "LOWER(m.name || ' ' || m.kind || ' ' || COALESCE(f.name,'') || ' ' || \
    COALESCE((SELECT GROUP_CONCAT(t.name,' ') FROM material_tags mt JOIN tags t ON t.id=mt.tag_id \
    WHERE mt.material_id=m.id),''))";

pub fn list(
    conn: &Connection,
    query: &str,
    folder_id: Option<i64>,
    favorites: bool,
    sort: &str,
) -> Result<Vec<Material>> {
    let p = patterns(query);
    let order = SORTS.iter().find(|(k, _)| *k == sort).map(|(_, v)| *v).unwrap_or(SORTS[0].1);
    let mut sql = format!(
        "SELECT {COLS} {FROM} WHERE {}",
        clause(SEARCHABLE, p.len())
    );
    let mut args: Vec<String> = p;
    if let Some(id) = folder_id {
        sql.push_str(" AND m.folder_id = ?");
        args.push(id.to_string());
    }
    if favorites {
        sql.push_str(" AND m.is_favorite = 1");
    }
    sql.push_str(" ORDER BY ");
    sql.push_str(order);
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(args.iter()), map)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub imported: usize,
    pub duplicates: usize,
    /// `(file name, human reason)` for everything the library refused.
    pub rejected: Vec<(String, String)>,
}

/// Validate a path for import: absolute, existing, a real file, supported type.
fn check(raw: &str) -> std::result::Result<(PathBuf, String, i64), String> {
    let path = PathBuf::from(raw);
    if !path.is_absolute() {
        return Err("Not a full file path.".into());
    }
    let meta = match std::fs::metadata(&path) {
        Ok(m) => m,
        Err(_) => return Err("File not found.".into()),
    };
    if !meta.is_file() {
        return Err("Folders can not be imported - add the files inside it.".into());
    }
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();
    if !SUPPORTED.contains(&ext.as_str()) {
        return Err(if ext.is_empty() {
            "Unrecognised file type.".to_string()
        } else {
            format!("{} files are not supported.", ext.to_uppercase())
        });
    }
    Ok((path, ext.to_uppercase(), meta.len() as i64))
}

pub fn import(
    conn: &Connection,
    paths: Vec<String>,
    folder_id: Option<i64>,
) -> Result<ImportResult> {
    let mut out = ImportResult { imported: 0, duplicates: 0, rejected: vec![] };
    for raw in paths {
        let label = Path::new(&raw)
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_else(|| raw.clone());
        match check(&raw) {
            Err(reason) => {
                tracing::warn!(path = %raw, %reason, "import rejected");
                out.rejected.push((label, reason));
            }
            Ok((path, kind, size)) => {
                let name = path
                    .file_stem()
                    .map(|s| s.to_string_lossy().into_owned())
                    .unwrap_or_else(|| label.clone());
                // Referencing, never copying - see PLAN.md section 10.
                let n = conn.execute(
                    "INSERT OR IGNORE INTO materials (name, path, kind, file_size, folder_id)
                     VALUES (?1,?2,?3,?4,?5)",
                    params![name, path.to_string_lossy(), kind, size, folder_id],
                )?;
                if n == 1 {
                    out.imported += 1;
                } else {
                    out.duplicates += 1;
                }
            }
        }
    }
    Ok(out)
}

/// Add a web link to the library. Only http(s) is accepted: the URL is handed to
/// the OS to open, so no other scheme is safe to store.
pub fn add_link(
    conn: &Connection,
    url: &str,
    name: Option<String>,
    folder_id: Option<i64>,
) -> Result<i64> {
    let url = url.trim();
    if !is_url(url) {
        return Err(AppError::msg("A link needs to start with http:// or https://"));
    }
    if url.len() > 2000 {
        return Err(AppError::msg("That link is too long."));
    }
    // Lowercase the scheme only — a path is case-sensitive, a scheme is not.
    let url = match url.find("://") {
        Some(i) => format!("{}{}", url[..i].to_ascii_lowercase(), &url[i..]),
        None => url.to_string(),
    };
    let host = host_of(&url);
    if host.is_empty() {
        return Err(AppError::msg("That link is missing a website address."));
    }
    let name = name
        .map(|n| n.trim().to_string())
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| host.to_string());
    let n = conn.execute(
        "INSERT OR IGNORE INTO materials (name, path, kind, folder_id) VALUES (?1,?2,?3,?4)",
        params![name, url, LINK, folder_id],
    )?;
    if n == 0 {
        return Err(AppError::msg("That link is already in your library."));
    }
    Ok(conn.last_insert_rowid())
}

fn path_of(conn: &Connection, id: i64) -> Result<String> {
    Ok(conn.query_row("SELECT path FROM materials WHERE id = ?1", params![id], |r| r.get(0))?)
}

#[tauri::command]
pub fn materials_list(
    db: tauri::State<Db>,
    query: Option<String>,
    folder_id: Option<i64>,
    favorites: Option<bool>,
    sort: Option<String>,
) -> Result<Vec<Material>> {
    list(
        &db.conn(),
        query.as_deref().unwrap_or(""),
        folder_id,
        favorites.unwrap_or(false),
        sort.as_deref().unwrap_or("name"),
    )
}

#[tauri::command]
pub fn material_get(db: tauri::State<Db>, id: i64) -> Result<Material> {
    let conn = db.conn();
    let sql = format!("SELECT {COLS} {FROM} WHERE m.id = ?1");
    Ok(conn.query_row(&sql, params![id], map)?)
}

#[tauri::command]
pub fn materials_import(
    db: tauri::State<Db>,
    paths: Vec<String>,
    folder_id: Option<i64>,
) -> Result<ImportResult> {
    import(&db.conn(), paths, folder_id)
}

#[tauri::command]
pub fn material_add_link(
    db: tauri::State<Db>,
    url: String,
    name: Option<String>,
    folder_id: Option<i64>,
) -> Result<i64> {
    add_link(&db.conn(), &url, name, folder_id)
}

#[tauri::command]
pub fn material_open(app: tauri::AppHandle, db: tauri::State<Db>, id: i64) -> Result<()> {
    let path = path_of(&db.conn(), id)?;
    if is_url(&path) {
        app.opener().open_url(&path, None::<&str>).map_err(|e| {
            tracing::error!(error = %e, url = %path, "open link failed");
            AppError::msg("Couldn't open this link in your browser.")
        })?;
    } else {
        if !Path::new(&path).exists() {
            return Err(AppError::msg("This file may have been moved or deleted."));
        }
        app.opener().open_path(&path, None::<&str>).map_err(|e| {
            tracing::error!(error = %e, %path, "open failed");
            AppError::msg("Couldn't open this file. There may be no app associated with this type.")
        })?;
    }
    db.conn().execute(
        "UPDATE materials SET last_opened_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

#[tauri::command]
pub fn material_reveal(app: tauri::AppHandle, db: tauri::State<Db>, id: i64) -> Result<()> {
    let path = path_of(&db.conn(), id)?;
    if is_url(&path) {
        return Err(AppError::msg("A link has no folder to show."));
    }
    app.opener().reveal_item_in_dir(&path).map_err(|e| {
        tracing::error!(error = %e, %path, "reveal failed");
        AppError::msg("Couldn't show this file. Its folder may no longer exist.")
    })
}

/// Renames the library entry only - the file on disk is left untouched.
#[tauri::command]
pub fn material_rename(db: tauri::State<Db>, id: i64, name: String) -> Result<()> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::msg("A material needs a name."));
    }
    db.conn().execute(
        "UPDATE materials SET name = ?2, updated_at = datetime('now') WHERE id = ?1",
        params![id, name],
    )?;
    Ok(())
}

#[tauri::command]
pub fn material_move(db: tauri::State<Db>, id: i64, folder_id: Option<i64>) -> Result<()> {
    db.conn().execute(
        "UPDATE materials SET folder_id = ?2, updated_at = datetime('now') WHERE id = ?1",
        params![id, folder_id],
    )?;
    Ok(())
}

#[tauri::command]
pub fn material_favorite(db: tauri::State<Db>, id: i64, favorite: bool) -> Result<()> {
    db.conn().execute(
        "UPDATE materials SET is_favorite = ?2, updated_at = datetime('now') WHERE id = ?1",
        params![id, favorite],
    )?;
    Ok(())
}

/// Removes the library entry. The file on disk is never deleted.
#[tauri::command]
pub fn material_remove(db: tauri::State<Db>, id: i64) -> Result<()> {
    db.conn().execute("DELETE FROM materials WHERE id = ?1", params![id])?;
    Ok(())
}

/// Point an entry at a file that moved, keeping its tags and folder.
#[tauri::command]
pub fn material_relocate(db: tauri::State<Db>, id: i64, path: String) -> Result<()> {
    let (path, kind, size) = check(&path).map_err(AppError::msg)?;
    db.conn().execute(
        "UPDATE materials SET path = ?2, kind = ?3, file_size = ?4, updated_at = datetime('now')
         WHERE id = ?1",
        params![id, path.to_string_lossy(), kind, size],
    )?;
    Ok(())
}

#[tauri::command]
pub fn material_set_tags(db: tauri::State<Db>, id: i64, tags: Vec<String>) -> Result<()> {
    set_tags(&mut db.conn(), id, tags)
}

pub fn set_tags(conn: &mut Connection, id: i64, tags: Vec<String>) -> Result<()> {
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM material_tags WHERE material_id = ?1", params![id])?;
    for tag in tags {
        let tag = tag.trim().to_lowercase();
        if tag.is_empty() || tag.chars().count() > 32 {
            continue;
        }
        tx.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", params![tag])?;
        tx.execute(
            "INSERT OR IGNORE INTO material_tags (material_id, tag_id)
             VALUES (?1, (SELECT id FROM tags WHERE name = ?2))",
            params![id, tag],
        )?;
    }
    tx.execute(
        "UPDATE materials SET updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    tx.commit()?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: i64,
    pub name: String,
    pub count: i64,
}

#[tauri::command]
pub fn folders_list(db: tauri::State<Db>) -> Result<Vec<Folder>> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT f.id, f.name, (SELECT COUNT(*) FROM materials m WHERE m.folder_id = f.id)
         FROM folders f ORDER BY f.name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(Folder { id: r.get(0)?, name: r.get(1)?, count: r.get(2)? })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

#[tauri::command]
pub fn folder_create(db: tauri::State<Db>, name: String) -> Result<i64> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::msg("A folder needs a name."));
    }
    let conn = db.conn();
    conn.execute("INSERT INTO folders (name) VALUES (?1)", params![name])?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn folder_rename(db: tauri::State<Db>, id: i64, name: String) -> Result<()> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::msg("A folder needs a name."));
    }
    db.conn().execute("UPDATE folders SET name = ?2 WHERE id = ?1", params![id, name])?;
    Ok(())
}

/// Materials inside keep their entry and fall back to "All materials".
#[tauri::command]
pub fn folder_delete(db: tauri::State<Db>, id: i64) -> Result<()> {
    db.conn().execute("DELETE FROM folders WHERE id = ?1", params![id])?;
    Ok(())
}

#[tauri::command]
pub fn tags_list(db: tauri::State<Db>) -> Result<Vec<String>> {
    let conn = db.conn();
    let mut stmt = conn.prepare(
        "SELECT t.name FROM tags t JOIN material_tags mt ON mt.tag_id = t.id
         GROUP BY t.id ORDER BY COUNT(*) DESC, t.name LIMIT 40",
    )?;
    let rows = stmt.query_map([], |r| r.get(0))?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}
