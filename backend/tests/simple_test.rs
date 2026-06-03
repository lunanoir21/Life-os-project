mod common;

use sqlx::Row;

#[tokio::test]
async fn test_database_setup() {
    let (pool, _temp_file) = common::setup_test_db().await;

    // Verify tables were created
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
        .fetch_one(&pool)
        .await
        .expect("Failed to query tables");

    println!("Tables created: {}", count);
    assert!(count > 10, "Expected at least 10 tables, got {}", count);

    // Try inserting a task
    let now = chrono::Utc::now().timestamp_millis();
    let id = cuid::cuid1().expect("Failed to generate ID");

    sqlx::query(
        "INSERT INTO Task (id, title, status, priority, position, archived, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind("Test Task")
    .bind("todo")
    .bind("medium")
    .bind(0_i64)
    .bind(0_i64)
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await
    .expect("Failed to insert task");

    // Read it back
    let row = sqlx::query("SELECT title FROM Task WHERE id = ?")
        .bind(&id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch task");

    let title: String = row.try_get("title").expect("Failed to get title");
    assert_eq!(title, "Test Task");

    println!("Database setup test passed!");
}
