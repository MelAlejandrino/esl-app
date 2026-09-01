use crate::db::Db;
use crate::error::Result;
use rusqlite::params_from_iter;
use serde::Serialize;

/// Split a query into lowercase LIKE patterns. `"travel b1"` -> `["%travel%", "%b1%"]`
/// so every token must appear somewhere in the searched text.
pub fn patterns(q: &str) -> Vec<String> {
    q.split_whitespace()
        .take(8) // ponytail: a teacher never types 9 useful search words
        .map(|t| format!("%{}%", t.to_lowercase()))
        .collect()
}

/// `haystack LIKE ? AND haystack LIKE ? ...` for each token.
/// ponytail: LIKE scan, not FTS5. A personal library is thousands of rows, not
/// millions — switch to FTS5 if search ever feels slow.
pub fn clause(haystack: &str, n: usize) -> String {
    if n == 0 {
        return "1".into();
    }
    (0..n)
        .map(|_| format!("{haystack} LIKE ?"))
        .collect::<Vec<_>>()
        .join(" AND ")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Hit {
    pub kind: &'static str,
    pub id: i64,
    pub title: String,
    pub subtitle: String,
}

#[derive(Serialize)]
pub struct GlobalResults {
    pub students: Vec<Hit>,
    pub notes: Vec<Hit>,
    pub materials: Vec<Hit>,
}

pub fn global(conn: &rusqlite::Connection, q: &str) -> Result<GlobalResults> {
    let p = patterns(q);
    let n = p.len();
    if n == 0 {
        return Ok(GlobalResults { students: vec![], notes: vec![], materials: vec![] });
    }

    let mut students = Vec::new();
    let sql = format!(
        "SELECT id, name, COALESCE(english_level,'') FROM students
         WHERE archived_at IS NULL AND {}
         ORDER BY viewed_at DESC NULLS LAST, name LIMIT 6",
        clause("LOWER(name || ' ' || COALESCE(preferred_name,'') || ' ' || COALESCE(english_level,''))", n)
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(p.iter()), |r| {
        Ok(Hit { kind: "student", id: r.get(0)?, title: r.get(1)?, subtitle: r.get(2)? })
    })?;
    for h in rows {
        students.push(h?);
    }

    let mut notes = Vec::new();
    let sql = format!(
        "SELECT n.id, COALESCE(NULLIF(n.topic,''),'Untitled class'), s.name || '  ·  ' || n.class_date
         FROM class_notes n JOIN students s ON s.id = n.student_id
         WHERE {} ORDER BY n.class_date DESC LIMIT 6",
        clause(
            "LOWER(COALESCE(n.topic,'') || ' ' || COALESCE(n.lesson_content,'') || ' ' || COALESCE(n.homework,'') || ' ' || COALESCE(n.next_lesson,'') || ' ' || s.name)",
            n
        )
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(p.iter()), |r| {
        Ok(Hit { kind: "note", id: r.get(0)?, title: r.get(1)?, subtitle: r.get(2)? })
    })?;
    for h in rows {
        notes.push(h?);
    }

    let mut materials = Vec::new();
    let sql = format!(
        "SELECT m.id, m.name, COALESCE(f.name, m.kind)
         FROM materials m LEFT JOIN folders f ON f.id = m.folder_id
         WHERE {} ORDER BY m.is_favorite DESC, m.last_opened_at DESC NULLS LAST, m.name LIMIT 6",
        clause(
            "LOWER(m.name || ' ' || m.kind || ' ' || COALESCE(f.name,'') || ' ' || COALESCE((SELECT GROUP_CONCAT(t.name,' ') FROM material_tags mt JOIN tags t ON t.id=mt.tag_id WHERE mt.material_id=m.id),''))",
            n
        )
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(p.iter()), |r| {
        Ok(Hit { kind: "material", id: r.get(0)?, title: r.get(1)?, subtitle: r.get(2)? })
    })?;
    for h in rows {
        materials.push(h?);
    }

    Ok(GlobalResults { students, notes, materials })
}

#[tauri::command]
pub fn search_global(db: tauri::State<Db>, query: String) -> Result<GlobalResults> {
    global(&db.conn(), &query)
}
