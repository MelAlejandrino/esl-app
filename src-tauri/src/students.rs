use crate::db::Db;
use crate::error::{AppError, Result};
use crate::search::{clause, patterns};
use rusqlite::{params, params_from_iter, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Student {
    pub id: i64,
    pub name: String,
    pub preferred_name: Option<String>,
    pub age: Option<i64>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub english_level: Option<String>,
    pub goals: Option<String>,
    pub general_notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub archived_at: Option<String>,
    pub viewed_at: Option<String>,
    pub note_count: i64,
    pub last_class: Option<String>,
}

const COLS: &str = "s.id, s.name, s.preferred_name, s.age, s.email, s.phone, s.english_level,
    s.goals, s.general_notes, s.created_at, s.updated_at, s.archived_at, s.viewed_at,
    (SELECT COUNT(*) FROM class_notes n WHERE n.student_id = s.id),
    (SELECT MAX(n.class_date) FROM class_notes n WHERE n.student_id = s.id)";

fn map(r: &Row) -> rusqlite::Result<Student> {
    Ok(Student {
        id: r.get(0)?,
        name: r.get(1)?,
        preferred_name: r.get(2)?,
        age: r.get(3)?,
        email: r.get(4)?,
        phone: r.get(5)?,
        english_level: r.get(6)?,
        goals: r.get(7)?,
        general_notes: r.get(8)?,
        created_at: r.get(9)?,
        updated_at: r.get(10)?,
        archived_at: r.get(11)?,
        viewed_at: r.get(12)?,
        note_count: r.get(13)?,
        last_class: r.get(14)?,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentInput {
    pub id: Option<i64>,
    pub name: String,
    pub preferred_name: Option<String>,
    pub age: Option<i64>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub english_level: Option<String>,
    pub goals: Option<String>,
    pub general_notes: Option<String>,
}

/// Trim, and turn empty strings into NULL so the UI never renders a blank field.
fn clean(v: Option<String>) -> Option<String> {
    v.map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

impl StudentInput {
    fn validate(mut self) -> Result<Self> {
        self.name = self.name.trim().to_string();
        if self.name.is_empty() {
            return Err(AppError::msg("A student needs a name."));
        }
        if self.name.chars().count() > 120 {
            return Err(AppError::msg("That name is too long."));
        }
        self.preferred_name = clean(self.preferred_name);
        self.email = clean(self.email);
        self.phone = clean(self.phone);
        self.english_level = clean(self.english_level);
        self.goals = clean(self.goals);
        self.general_notes = clean(self.general_notes);
        if let Some(age) = self.age {
            if !(1..=120).contains(&age) {
                return Err(AppError::msg("Age should be between 1 and 120."));
            }
        }
        if let Some(email) = &self.email {
            if !email.contains('@') || email.contains(' ') {
                return Err(AppError::msg("That email address doesn't look right."));
            }
        }
        Ok(self)
    }
}

const SORTS: [(&str, &str); 4] = [
    ("name", "s.name COLLATE NOCASE"),
    ("recent", "s.viewed_at DESC NULLS LAST, s.name COLLATE NOCASE"),
    ("level", "s.english_level NULLS LAST, s.name COLLATE NOCASE"),
    ("lastClass", "last_class DESC NULLS LAST"),
];

pub fn list(
    conn: &Connection,
    query: &str,
    level: Option<String>,
    archived: bool,
    sort: &str,
) -> Result<Vec<Student>> {
    let p = patterns(query);
    let order = SORTS
        .iter()
        .find(|(k, _)| *k == sort)
        .map(|(_, v)| *v)
        .unwrap_or(SORTS[0].1);

    let mut sql = format!(
        "SELECT {COLS} FROM students s WHERE s.archived_at IS {} AND {}",
        if archived { "NOT NULL" } else { "NULL" },
        clause(
            "LOWER(s.name || ' ' || COALESCE(s.preferred_name,'') || ' ' || COALESCE(s.email,'') || ' ' || COALESCE(s.english_level,'') || ' ' || COALESCE(s.goals,''))",
            p.len()
        )
    );
    let mut args: Vec<String> = p;
    if let Some(l) = clean(level) {
        sql.push_str(" AND s.english_level = ?");
        args.push(l);
    }
    sql.push_str(&format!(" ORDER BY {order}"));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(args.iter()), map)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn save(conn: &Connection, input: StudentInput) -> Result<i64> {
    let i = input.validate()?;
    match i.id {
        Some(id) => {
            let n = conn.execute(
                "UPDATE students SET name=?1, preferred_name=?2, age=?3, email=?4, phone=?5,
                   english_level=?6, goals=?7, general_notes=?8, updated_at=datetime('now')
                 WHERE id=?9",
                params![i.name, i.preferred_name, i.age, i.email, i.phone, i.english_level, i.goals, i.general_notes, id],
            )?;
            if n == 0 {
                return Err(AppError::msg("That student no longer exists."));
            }
            Ok(id)
        }
        None => {
            conn.execute(
                "INSERT INTO students (name, preferred_name, age, email, phone, english_level, goals, general_notes)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
                params![i.name, i.preferred_name, i.age, i.email, i.phone, i.english_level, i.goals, i.general_notes],
            )?;
            Ok(conn.last_insert_rowid())
        }
    }
}

#[tauri::command]
pub fn students_list(
    db: tauri::State<Db>,
    query: Option<String>,
    level: Option<String>,
    archived: Option<bool>,
    sort: Option<String>,
) -> Result<Vec<Student>> {
    list(
        &db.conn(),
        query.as_deref().unwrap_or(""),
        level,
        archived.unwrap_or(false),
        sort.as_deref().unwrap_or("name"),
    )
}

#[tauri::command]
pub fn student_get(db: tauri::State<Db>, id: i64) -> Result<Student> {
    let conn = db.conn();
    let sql = format!("SELECT {COLS} FROM students s WHERE s.id = ?1");
    Ok(conn.query_row(&sql, params![id], map)?)
}

#[tauri::command]
pub fn student_save(db: tauri::State<Db>, input: StudentInput) -> Result<i64> {
    save(&db.conn(), input)
}

/// Records "recently viewed" without the frontend keeping its own list.
#[tauri::command]
pub fn student_touch(db: tauri::State<Db>, id: i64) -> Result<()> {
    db.conn()
        .execute("UPDATE students SET viewed_at = datetime('now') WHERE id = ?1", params![id])?;
    Ok(())
}

#[tauri::command]
pub fn student_archive(db: tauri::State<Db>, id: i64, archived: bool) -> Result<()> {
    db.conn().execute(
        "UPDATE students SET archived_at = CASE WHEN ?2 THEN datetime('now') END,
           updated_at = datetime('now') WHERE id = ?1",
        params![id, archived],
    )?;
    Ok(())
}

/// Hard delete. Class notes cascade — the UI must say so before calling this.
#[tauri::command]
pub fn student_delete(db: tauri::State<Db>, id: i64) -> Result<()> {
    db.conn().execute("DELETE FROM students WHERE id = ?1", params![id])?;
    Ok(())
}
