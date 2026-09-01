use crate::db::Db;
use crate::error::{AppError, Result};
use crate::search::{clause, patterns};
use rusqlite::{params, params_from_iter, Connection, Row};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassNote {
    pub id: i64,
    pub student_id: i64,
    pub student_name: String,
    pub class_date: String,
    pub topic: Option<String>,
    pub lesson_content: Option<String>,
    pub performance: Option<String>,
    pub difficulties: Option<String>,
    pub homework: Option<String>,
    pub next_lesson: Option<String>,
    pub additional_notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

const COLS: &str = "n.id, n.student_id, s.name, n.class_date, n.topic, n.lesson_content,
    n.performance, n.difficulties, n.homework, n.next_lesson, n.additional_notes,
    n.created_at, n.updated_at";

const FROM: &str = "FROM class_notes n JOIN students s ON s.id = n.student_id";

fn map(r: &Row) -> rusqlite::Result<ClassNote> {
    Ok(ClassNote {
        id: r.get(0)?,
        student_id: r.get(1)?,
        student_name: r.get(2)?,
        class_date: r.get(3)?,
        topic: r.get(4)?,
        lesson_content: r.get(5)?,
        performance: r.get(6)?,
        difficulties: r.get(7)?,
        homework: r.get(8)?,
        next_lesson: r.get(9)?,
        additional_notes: r.get(10)?,
        created_at: r.get(11)?,
        updated_at: r.get(12)?,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteInput {
    pub id: Option<i64>,
    pub student_id: i64,
    pub class_date: String,
    pub topic: Option<String>,
    pub lesson_content: Option<String>,
    pub performance: Option<String>,
    pub difficulties: Option<String>,
    pub homework: Option<String>,
    pub next_lesson: Option<String>,
    pub additional_notes: Option<String>,
}

fn clean(v: Option<String>) -> Option<String> {
    v.map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

/// ISO date, checked by shape. The date input widget already constrains it;
/// this stops a malformed value from breaking date sorting.
fn valid_date(d: &str) -> bool {
    let b = d.as_bytes();
    b.len() == 10
        && b[4] == b'-'
        && b[7] == b'-'
        && b.iter().enumerate().all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit())
}

impl NoteInput {
    fn validate(mut self) -> Result<Self> {
        if !valid_date(&self.class_date) {
            return Err(AppError::msg("Pick a valid class date."));
        }
        self.topic = clean(self.topic);
        self.lesson_content = clean(self.lesson_content);
        self.performance = clean(self.performance);
        self.difficulties = clean(self.difficulties);
        self.homework = clean(self.homework);
        self.next_lesson = clean(self.next_lesson);
        self.additional_notes = clean(self.additional_notes);
        if self.topic.is_none() && self.lesson_content.is_none() {
            return Err(AppError::msg("Add a topic or a few words about the class."));
        }
        Ok(self)
    }
}

pub fn list(
    conn: &Connection,
    student_id: Option<i64>,
    query: &str,
    limit: Option<i64>,
) -> Result<Vec<ClassNote>> {
    let p = patterns(query);
    let mut sql = format!(
        "SELECT {COLS} {FROM} WHERE {}",
        clause(
            "LOWER(COALESCE(n.topic,'') || ' ' || COALESCE(n.lesson_content,'') || ' ' || COALESCE(n.homework,'') || ' ' || COALESCE(n.next_lesson,'') || ' ' || COALESCE(n.performance,'') || ' ' || COALESCE(n.difficulties,'') || ' ' || s.name)",
            p.len()
        )
    );
    let mut args: Vec<String> = p;
    if let Some(id) = student_id {
        sql.push_str(" AND n.student_id = ?");
        args.push(id.to_string());
    }
    sql.push_str(" ORDER BY n.class_date DESC, n.id DESC");
    if let Some(n) = limit {
        sql.push_str(&format!(" LIMIT {}", n.clamp(1, 500)));
    }
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(args.iter()), map)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn save(conn: &Connection, input: NoteInput) -> Result<i64> {
    let i = input.validate()?;
    match i.id {
        Some(id) => {
            let n = conn.execute(
                "UPDATE class_notes SET student_id=?1, class_date=?2, topic=?3, lesson_content=?4,
                   performance=?5, difficulties=?6, homework=?7, next_lesson=?8,
                   additional_notes=?9, updated_at=datetime('now') WHERE id=?10",
                params![i.student_id, i.class_date, i.topic, i.lesson_content, i.performance,
                        i.difficulties, i.homework, i.next_lesson, i.additional_notes, id],
            )?;
            if n == 0 {
                return Err(AppError::msg("That class note no longer exists."));
            }
            Ok(id)
        }
        None => {
            conn.execute(
                "INSERT INTO class_notes (student_id, class_date, topic, lesson_content, performance,
                   difficulties, homework, next_lesson, additional_notes)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
                params![i.student_id, i.class_date, i.topic, i.lesson_content, i.performance,
                        i.difficulties, i.homework, i.next_lesson, i.additional_notes],
            )?;
            Ok(conn.last_insert_rowid())
        }
    }
}

#[tauri::command]
pub fn notes_list(
    db: tauri::State<Db>,
    student_id: Option<i64>,
    query: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<ClassNote>> {
    list(&db.conn(), student_id, query.as_deref().unwrap_or(""), limit)
}

#[tauri::command]
pub fn note_get(db: tauri::State<Db>, id: i64) -> Result<ClassNote> {
    let conn = db.conn();
    let sql = format!("SELECT {COLS} {FROM} WHERE n.id = ?1");
    Ok(conn.query_row(&sql, params![id], map)?)
}

#[tauri::command]
pub fn note_save(db: tauri::State<Db>, input: NoteInput) -> Result<i64> {
    save(&db.conn(), input)
}

#[tauri::command]
pub fn note_delete(db: tauri::State<Db>, id: i64) -> Result<()> {
    db.conn().execute("DELETE FROM class_notes WHERE id = ?1", params![id])?;
    Ok(())
}
