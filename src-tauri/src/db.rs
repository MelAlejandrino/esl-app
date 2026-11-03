use crate::error::{AppError, Result};
use rusqlite::Connection;
use std::sync::Mutex;

pub struct Db(pub Mutex<Connection>);

impl Db {
    pub fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        // A poisoned lock means a previous command panicked mid-query; the
        // connection itself is still usable, so recover rather than crash.
        self.0.lock().unwrap_or_else(|e| e.into_inner())
    }
}

const SCHEMA: &str = r#"
CREATE TABLE students (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  preferred_name TEXT,
  age            INTEGER,
  email          TEXT,
  phone          TEXT,
  english_level  TEXT,
  goals          TEXT,
  general_notes  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at    TEXT,
  viewed_at      TEXT
);
CREATE INDEX idx_students_name ON students(name);

CREATE TABLE class_notes (
  id               INTEGER PRIMARY KEY,
  student_id       INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_date       TEXT NOT NULL,
  topic            TEXT,
  lesson_content   TEXT,
  performance      TEXT,
  difficulties     TEXT,
  homework         TEXT,
  next_lesson      TEXT,
  additional_notes TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notes_student_date ON class_notes(student_id, class_date DESC);
CREATE INDEX idx_notes_date ON class_notes(class_date DESC);

CREATE TABLE folders (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE materials (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  path           TEXT NOT NULL UNIQUE,
  kind           TEXT NOT NULL,
  file_size      INTEGER,
  folder_id      INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  is_favorite    INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_opened_at TEXT
);
CREATE INDEX idx_materials_name ON materials(name);
CREATE INDEX idx_materials_folder ON materials(folder_id);

CREATE TABLE tags (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE material_tags (
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (material_id, tag_id)
);

INSERT INTO folders (name) VALUES
  ('Grammar'),('Vocabulary'),('Speaking'),('Listening'),('Reading'),('Writing'),('Worksheets');
"#;

/// Migrations, the lazy way: `user_version` is the schema version. Each step is
/// applied once, in order, inside a transaction.
/// ponytail: plain array of steps instead of a migration crate — add step 2 by
/// pushing another `&str`; move to a real migration tool only if steps get
/// data-dependent.
const MIGRATIONS: &[&str] = &[SCHEMA, "ALTER TABLE students ADD COLUMN color TEXT;"];

/// The schema version this build speaks. A backup from a different one is refused
/// rather than half-imported.
pub fn current_version() -> i64 {
    MIGRATIONS.len() as i64
}

/// Parents before children: restore inserts in this order, and clears in reverse.
const TABLES: [&str; 6] = [
    "students",
    "class_notes",
    "folders",
    "materials",
    "tags",
    "material_tags",
];

/// Replace every row in the live database with the contents of a backup file.
///
/// The backup is attached and copied inside one transaction, so a failure leaves
/// the teacher's existing data untouched and no restart is needed.
pub fn restore(conn: &mut Connection, src: &std::path::Path) -> Result<()> {
    if !src.is_file() {
        return Err(AppError::msg("Couldn't find that backup file."));
    }
    verify(src)?;

    conn.execute("ATTACH DATABASE ?1 AS backup", [src.to_string_lossy()])?;
    let outcome = copy_from_backup(conn);
    // Detach even when the copy failed, or the next restore can't attach.
    if let Err(e) = conn.execute("DETACH DATABASE backup", []) {
        tracing::error!(error = %e, "detaching backup failed");
    }
    if outcome.is_ok() {
        tracing::info!(src = %src.display(), "restored from backup");
    }
    outcome
}

/// Is this actually one of our backups, and one this build understands?
fn verify(src: &std::path::Path) -> Result<()> {
    let probe = Connection::open_with_flags(src, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| {
            tracing::warn!(error = %e, "backup unreadable");
            AppError::msg("That file isn't an ESL App backup, or it's damaged.")
        })?;

    for table in TABLES {
        let found: i64 = probe
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
                [table],
                |r| r.get(0),
            )
            .unwrap_or(0);
        if found == 0 {
            return Err(AppError::msg("That file isn't an ESL App backup."));
        }
    }

    let version: i64 = probe.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version != current_version() {
        return Err(AppError::msg(
            "That backup was made by a different version of ESL App and can't be restored here.",
        ));
    }
    Ok(())
}

fn copy_from_backup(conn: &mut Connection) -> Result<()> {
    let tx = conn.transaction()?;
    // Foreign keys are checked at commit, so wipe-then-refill order can't trip them.
    tx.pragma_update(None, "defer_foreign_keys", true)?;
    for table in TABLES.iter().rev() {
        tx.execute(&format!("DELETE FROM main.{table}"), [])?;
    }
    for table in TABLES {
        tx.execute(
            &format!("INSERT INTO main.{table} SELECT * FROM backup.{table}"),
            [],
        )?;
    }
    tx.commit()?;
    Ok(())
}

pub fn open(path: &std::path::Path) -> Result<Connection> {
    let mut conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&mut conn)?;
    Ok(conn)
}

pub fn migrate(conn: &mut Connection) -> Result<()> {
    let version: usize =
        conn.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0))? as usize;
    for (i, sql) in MIGRATIONS.iter().enumerate().skip(version) {
        tracing::info!(step = i + 1, "applying migration");
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.pragma_update(None, "user_version", (i + 1) as i64)?;
        tx.commit()?;
    }
    Ok(())
}

#[cfg(test)]
pub fn memory() -> Connection {
    let mut conn = Connection::open_in_memory().unwrap();
    conn.pragma_update(None, "foreign_keys", "ON").unwrap();
    migrate(&mut conn).unwrap();
    conn
}
