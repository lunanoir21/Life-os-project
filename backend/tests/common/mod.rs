use lifeos_backend::{build_app, db};
use sqlx::SqlitePool;
use std::fs;
use tempfile::NamedTempFile;

/// Creates an isolated test database with the full schema applied.
/// Returns a pool connected to a temporary SQLite file that will be
/// cleaned up automatically when the NamedTempFile is dropped.
pub async fn setup_test_db() -> (SqlitePool, NamedTempFile) {
    // Create a temporary file for the test database
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db_path = temp_file.path().to_str().expect("Invalid temp path");
    let db_url = format!("sqlite:{}", db_path);

    // Create the database pool with foreign keys enabled
    let pool = db::make_pool(&db_url)
        .await
        .expect("Failed to create test database pool");

    // Read and apply the schema
    let schema_sql = fs::read_to_string("tests/schema.sql")
        .expect("Failed to read schema.sql - make sure it exists in backend/tests/");

    // Execute each statement separately (sqlx doesn't support multiple statements in one query)
    // Don't filter out lines starting with -- because they're just comments within statements
    for statement in schema_sql.split(';') {
        let stmt = statement.trim();
        // Skip empty statements
        if stmt.is_empty() {
            continue;
        }
        // Skip standalone comment lines
        if stmt
            .lines()
            .all(|line| line.trim().is_empty() || line.trim().starts_with("--"))
        {
            continue;
        }

        sqlx::query(stmt).execute(&pool).await.unwrap_or_else(|e| {
            panic!(
                "Failed to execute schema statement:\n{}\n\nError: {}",
                stmt, e
            )
        });
    }

    (pool, temp_file)
}

/// Build a test app instance with an isolated database.
/// Returns (app_router, temp_db_file).
/// The temp_db_file must be kept alive for the duration of the test.
pub async fn setup_test_app() -> (axum::Router, NamedTempFile) {
    let (pool, temp_file) = setup_test_db().await;
    let app = build_app(pool);
    (app, temp_file)
}

/// Helper to convert Prisma DateTime milliseconds to current timestamp
pub fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

/// Helper to generate a test CUID (uses the real cuid crate)
pub fn gen_test_id() -> String {
    cuid::cuid1().expect("Failed to generate test ID")
}
