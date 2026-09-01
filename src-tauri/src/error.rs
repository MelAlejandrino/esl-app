use serde::Serialize;

/// The single error type crossing the Tauri boundary.
/// `message` is safe to show a teacher; technical detail goes to `tracing`.
#[derive(Debug, Serialize)]
pub struct AppError {
    pub message: String,
}

pub type Result<T> = std::result::Result<T, AppError>;

impl AppError {
    pub fn msg(m: impl Into<String>) -> Self {
        AppError { message: m.into() }
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        tracing::error!(error = %e, "database error");
        let message = match &e {
            rusqlite::Error::QueryReturnedNoRows => "That item no longer exists.",
            rusqlite::Error::SqliteFailure(err, _)
                if err.code == rusqlite::ErrorCode::ConstraintViolation =>
            {
                "Couldn't save this. A linked item may have been removed, or that name is already used."
            }
            _ => "Something went wrong saving your data. Your other data is safe.",
        };
        AppError::msg(message)
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        tracing::error!(error = %e, "file error");
        AppError::msg("Couldn't read that file. It may have been moved or renamed.")
    }
}
