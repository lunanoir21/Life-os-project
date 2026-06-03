use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;

/// Open a pool against the SQLite file Prisma manages. `foreign_keys(true)` is
/// required so ON DELETE CASCADE (subtasks, task tags, dependencies, etc.)
/// behaves the same way Prisma's client does — SQLite leaves FKs off by default.
pub async fn make_pool(url: &str) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::from_str(url)?
        .foreign_keys(true)
        .create_if_missing(false);

    SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
}
