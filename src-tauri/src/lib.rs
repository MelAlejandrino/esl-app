mod db;
mod error;
mod materials;
mod notes;
mod search;
mod students;

use db::Db;
use error::{AppError, Result};
use serde::Serialize;
use tauri::Manager;

/// Everything the dashboard needs, in one round trip.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Dashboard {
    student_count: i64,
    note_count: i64,
    material_count: i64,
    recent_students: Vec<students::Student>,
    recent_notes: Vec<notes::ClassNote>,
    recent_materials: Vec<materials::Material>,
}

#[tauri::command]
fn dashboard(db: tauri::State<Db>) -> Result<Dashboard> {
    let conn = db.conn();
    let count = |sql: &str| -> Result<i64> { Ok(conn.query_row(sql, [], |r| r.get(0))?) };
    Ok(Dashboard {
        student_count: count("SELECT COUNT(*) FROM students WHERE archived_at IS NULL")?,
        note_count: count("SELECT COUNT(*) FROM class_notes")?,
        material_count: count("SELECT COUNT(*) FROM materials")?,
        recent_students: students::list(&conn, "", None, false, "recent")?
            .into_iter()
            .take(5)
            .collect(),
        recent_notes: notes::list(&conn, None, "", Some(5))?,
        recent_materials: materials::list(&conn, "", None, false, "recent")?
            .into_iter()
            .take(6)
            .collect(),
    })
}

/// Backup with `VACUUM INTO`: one consistent file, WAL included, no file copying.
#[tauri::command]
fn db_backup(db: tauri::State<Db>, dest: String) -> Result<()> {
    let path = std::path::PathBuf::from(&dest);
    if !path.is_absolute() || path.parent().map(|p| !p.is_dir()).unwrap_or(true) {
        return Err(AppError::msg("Choose a folder that exists for the backup."));
    }
    if path.exists() {
        std::fs::remove_file(&path)?;
    }
    db.conn()
        .execute("VACUUM INTO ?1", [path.to_string_lossy()])
        .map_err(|e| {
            tracing::error!(error = %e, "backup failed");
            AppError::msg("Couldn't write the backup to that location.")
        })?;
    tracing::info!(dest = %dest, "backup written");
    Ok(())
}

/// Replaces everything with a backup. Destructive — the UI confirms first.
#[tauri::command]
fn db_restore(db: tauri::State<Db>, src: String) -> Result<()> {
    db::restore(&mut db.conn(), std::path::Path::new(&src))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "esl_app_lib=info,warn".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let path = dir.join("esl.db");
            tracing::info!(db = %path.display(), "opening database");
            let conn = db::open(&path).map_err(|e| e.message)?;
            app.manage(Db(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            dashboard,
            db_backup,
            db_restore,
            students::students_list,
            students::student_get,
            students::student_save,
            students::student_touch,
            students::student_archive,
            students::student_delete,
            notes::notes_list,
            notes::note_get,
            notes::note_save,
            notes::note_delete,
            materials::materials_list,
            materials::material_get,
            materials::materials_import,
            materials::material_open,
            materials::material_reveal,
            materials::material_rename,
            materials::material_move,
            materials::material_favorite,
            materials::material_remove,
            materials::material_relocate,
            materials::material_set_tags,
            materials::folders_list,
            materials::folder_create,
            materials::folder_rename,
            materials::folder_delete,
            materials::tags_list,
            search::search_global,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// One self-check over the parts that can actually break: validation, search
/// token AND-ing, cascade delete, and import rejection.
#[cfg(test)]
mod tests {
    use super::*;
    use notes::NoteInput;
    use students::StudentInput;

    fn student(name: &str, level: &str) -> StudentInput {
        StudentInput {
            id: None,
            name: name.into(),
            preferred_name: None,
            age: None,
            email: None,
            phone: None,
            english_level: Some(level.into()),
            goals: None,
            general_notes: None,
        }
    }

    fn note(student_id: i64, date: &str, topic: &str, body: &str) -> NoteInput {
        NoteInput {
            id: None,
            student_id,
            class_date: date.into(),
            topic: Some(topic.into()),
            lesson_content: Some(body.into()),
            performance: None,
            difficulties: None,
            homework: None,
            next_lesson: None,
            additional_notes: None,
        }
    }

    #[test]
    fn backup_restore_round_trip() {
        let mut conn = db::memory();
        let maria = students::save(&conn, student("Maria Santos", "B1")).unwrap();
        notes::save(&conn, note(maria, "2026-09-01", "Travel", "past tense")).unwrap();

        let dir = std::env::temp_dir().join("esl-app-test-backup");
        std::fs::create_dir_all(&dir).unwrap();
        let dest = dir.join("backup.db");
        let _ = std::fs::remove_file(&dest);
        conn.execute("VACUUM INTO ?1", [dest.to_string_lossy()]).unwrap();

        // Everything is lost after the backup was taken.
        conn.execute("DELETE FROM students", []).unwrap();
        assert_eq!(students::list(&conn, "", None, false, "name").unwrap().len(), 0);

        db::restore(&mut conn, &dest).unwrap();
        let back = students::list(&conn, "", None, false, "name").unwrap();
        assert_eq!(back.len(), 1);
        assert_eq!(back[0].name, "Maria Santos");
        assert_eq!(back[0].note_count, 1, "class notes come back too");

        // A file that isn't ours is refused outright, never half-imported.
        let junk = dir.join("not-a-backup.db");
        std::fs::write(&junk, b"not a database at all").unwrap();
        assert!(db::restore(&mut conn, &junk).is_err());
        assert_eq!(
            students::list(&conn, "", None, false, "name").unwrap().len(),
            1,
            "a refused restore leaves existing data alone"
        );

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn crud_search_and_import() {
        let mut conn = db::memory();

        // --- students: validation at the boundary
        assert!(students::save(&conn, student("   ", "B1")).is_err(), "blank name rejected");
        let mut bad = student("Maria Santos", "B1");
        bad.email = Some("nope".into());
        assert!(students::save(&conn, bad).is_err(), "bad email rejected");

        let maria = students::save(&conn, student("Maria Santos", "B1")).unwrap();
        let luis = students::save(&conn, student("Luis Garcia", "A2")).unwrap();
        assert_eq!(students::list(&conn, "", None, false, "name").unwrap().len(), 2);

        // --- students: search is case-insensitive and every token must match
        assert_eq!(students::list(&conn, "MARIA", None, false, "name").unwrap().len(), 1);
        assert_eq!(students::list(&conn, "maria b1", None, false, "name").unwrap().len(), 1);
        assert_eq!(students::list(&conn, "maria a2", None, false, "name").unwrap().len(), 0);
        assert_eq!(students::list(&conn, "", Some("A2".into()), false, "name").unwrap().len(), 1);

        // --- notes: date shape, required content, per-student listing
        assert!(notes::save(&conn, note(maria, "1-9-2026", "x", "y")).is_err(), "bad date");
        let mut empty = note(maria, "2026-09-01", "", "");
        empty.topic = None;
        empty.lesson_content = None;
        assert!(notes::save(&conn, empty).is_err(), "empty note rejected");

        notes::save(&conn, note(maria, "2026-08-28", "Present Perfect", "drills")).unwrap();
        notes::save(&conn, note(maria, "2026-09-01", "Travel Conversation", "past tense")).unwrap();
        notes::save(&conn, note(luis, "2026-08-30", "Airport role play", "vocab")).unwrap();

        let hers = notes::list(&conn, Some(maria), "", None).unwrap();
        assert_eq!(hers.len(), 2);
        assert_eq!(hers[0].class_date, "2026-09-01", "newest class first");
        assert_eq!(hers[0].student_name, "Maria Santos");

        // --- global search spans all three kinds
        let hits = search::global(&conn, "travel").unwrap();
        assert_eq!(hits.notes.len(), 1);
        assert!(hits.students.is_empty());

        // --- materials: only supported types, no duplicates, missing files flagged
        let dir = std::env::temp_dir().join("esl-app-test");
        std::fs::create_dir_all(&dir).unwrap();
        let good = dir.join("B1 Travel Conversation.pdf");
        let bad_ext = dir.join("notes.exe");
        std::fs::write(&good, b"x").unwrap();
        std::fs::write(&bad_ext, b"x").unwrap();

        let r = materials::import(
            &conn,
            vec![
                good.to_string_lossy().into(),
                bad_ext.to_string_lossy().into(),
                dir.join("ghost.pdf").to_string_lossy().into(),
                "relative/path.pdf".into(),
            ],
            None,
        )
        .unwrap();
        assert_eq!(r.imported, 1);
        assert_eq!(r.rejected.len(), 3, "unsupported, missing and relative all rejected");

        let again = materials::import(&conn, vec![good.to_string_lossy().into()], None).unwrap();
        assert_eq!((again.imported, again.duplicates), (0, 1), "same path imported once");

        let all = materials::list(&conn, "", None, false, "name").unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].name, "B1 Travel Conversation");
        assert_eq!(all[0].kind, "PDF");
        assert!(all[0].exists);

        materials::set_tags(&mut conn, all[0].id, vec!["Travel".into(), "b1".into()])
            .unwrap();
        assert_eq!(materials::list(&conn, "travel b1", None, false, "name").unwrap().len(), 1);
        assert_eq!(materials::list(&conn, "travel c1", None, false, "name").unwrap().len(), 0);

        std::fs::remove_file(&good).unwrap();
        assert!(!materials::list(&conn, "", None, false, "name").unwrap()[0].exists);

        // --- deleting a student takes their notes with them, and nobody else's
        conn.execute("DELETE FROM students WHERE id = ?1", [maria]).unwrap();
        assert_eq!(notes::list(&conn, None, "", None).unwrap().len(), 1);

        std::fs::remove_dir_all(&dir).ok();
    }
}
