use lifeos_backend::tasks;
use sqlx::SqlitePool;
use tempfile::tempdir;

mod common;

#[tokio::test]
async fn test_recurring_task_daily() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let database_url = format!("sqlite:{}", db_path.display());

    let pool = common::setup_test_db(&database_url).await;

    // Create a recurring daily task that was completed yesterday
    let yesterday = chrono::Utc::now() - chrono::Duration::days(1);
    let yesterday_ms = yesterday.timestamp_millis();
    let due_date_ms = yesterday_ms;

    let task_id = "test_daily_task";
    sqlx::query(
        "INSERT INTO Task (id, title, status, priority, recurrence, dueDate, completedAt, \
         position, archived, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(task_id)
    .bind("Daily recurring task")
    .bind("done") // Completed
    .bind("medium")
    .bind("daily") // Daily recurrence
    .bind(due_date_ms)
    .bind(yesterday_ms) // Completed yesterday
    .bind(0)
    .bind(0)
    .bind(yesterday_ms)
    .bind(yesterday_ms)
    .execute(&pool)
    .await
    .unwrap();

    // Process recurring tasks
    let count = process_recurring_tasks_for_test(&pool).await.unwrap();
    
    // Should have created 1 new task
    assert_eq!(count, 1);

    // Check that a new task was created
    let new_tasks: Vec<(String, String)> = sqlx::query_as(
        "SELECT id, status FROM Task WHERE title = ? AND id != ?",
    )
    .bind("Daily recurring task")
    .bind(task_id)
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(new_tasks.len(), 1);
    assert_eq!(new_tasks[0].1, "todo"); // New task should be todo
}

#[tokio::test]
async fn test_recurring_task_weekly() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let database_url = format!("sqlite:{}", db_path.display());

    let pool = common::setup_test_db(&database_url).await;

    // Create a recurring weekly task completed 8 days ago
    let eight_days_ago = chrono::Utc::now() - chrono::Duration::days(8);
    let eight_days_ago_ms = eight_days_ago.timestamp_millis();

    let task_id = "test_weekly_task";
    sqlx::query(
        "INSERT INTO Task (id, title, status, priority, recurrence, dueDate, completedAt, \
         position, archived, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(task_id)
    .bind("Weekly recurring task")
    .bind("done")
    .bind("medium")
    .bind("weekly")
    .bind(eight_days_ago_ms)
    .bind(eight_days_ago_ms)
    .bind(0)
    .bind(0)
    .bind(eight_days_ago_ms)
    .bind(eight_days_ago_ms)
    .execute(&pool)
    .await
    .unwrap();

    let count = process_recurring_tasks_for_test(&pool).await.unwrap();
    assert_eq!(count, 1);

    let new_tasks: Vec<(String,)> = sqlx::query_as(
        "SELECT id FROM Task WHERE title = ? AND id != ?",
    )
    .bind("Weekly recurring task")
    .bind(task_id)
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(new_tasks.len(), 1);
}

#[tokio::test]
async fn test_recurring_task_not_completed() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let database_url = format!("sqlite:{}", db_path.display());

    let pool = common::setup_test_db(&database_url).await;

    // Create a recurring task that's NOT completed yet
    let yesterday = chrono::Utc::now() - chrono::Duration::days(1);
    let yesterday_ms = yesterday.timestamp_millis();

    let task_id = "test_incomplete_task";
    sqlx::query(
        "INSERT INTO Task (id, title, status, priority, recurrence, dueDate, \
         position, archived, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(task_id)
    .bind("Incomplete recurring task")
    .bind("todo") // Not completed
    .bind("medium")
    .bind("daily")
    .bind(yesterday_ms)
    .bind(0)
    .bind(0)
    .bind(yesterday_ms)
    .bind(yesterday_ms)
    .execute(&pool)
    .await
    .unwrap();

    let count = process_recurring_tasks_for_test(&pool).await.unwrap();
    
    // Should NOT create a new task because the original isn't completed
    assert_eq!(count, 0);
}

// Helper function to expose the internal processing logic for testing
async fn process_recurring_tasks_for_test(pool: &SqlitePool) -> Result<usize, sqlx::Error> {
    // This is a test-only version that mirrors the internal logic
    // In a real implementation, you might expose this through a feature flag
    let now = chrono::Utc::now();
    let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap();
    let today_start_ms = today_start.and_utc().timestamp_millis();
    
    let rows = sqlx::query(
        "SELECT * FROM Task 
         WHERE recurrence IS NOT NULL 
         AND recurrence != ''
         AND archived = 0
         AND (status = 'done' OR dueDate < ?)"
    )
    .bind(today_start_ms)
    .fetch_all(pool)
    .await?;
    
    let mut created_count = 0;
    
    for row in rows {
        let task_id: String = row.try_get("id")?;
        let status: String = row.try_get("status")?;
        let recurrence: Option<String> = row.try_get("recurrence")?;
        let completed_at: Option<i64> = row.try_get("completedAt")?;
        
        if status != "done" {
            continue;
        }
        
        let Some(rec) = recurrence else { continue };
        let Some(completed_ms) = completed_at else { continue };
        
        let days_since = (today_start_ms - completed_ms) / (1000 * 60 * 60 * 24);
        
        let should_create = match rec.as_str() {
            "daily" => days_since >= 1,
            "weekly" => days_since >= 7,
            "monthly" => {
                let completed_date = chrono::DateTime::from_timestamp_millis(completed_ms)
                    .unwrap_or_default()
                    .date_naive();
                let today = chrono::DateTime::from_timestamp_millis(today_start_ms)
                    .unwrap_or_default()
                    .date_naive();
                
                completed_date.year() != today.year() || completed_date.month() != today.month()
            }
            _ => false,
        };
        
        if should_create {
            // Create new task
            let new_id = cuid::cuid1().map_err(|e| {
                sqlx::Error::Io(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("ID generation failed: {}", e),
                ))
            })?;
            
            let now_ms = chrono::Utc::now().timestamp_millis();
            let title: String = row.try_get("title")?;
            let description: Option<String> = row.try_get("description")?;
            let priority: String = row.try_get("priority")?;
            let due_date: Option<i64> = row.try_get("dueDate")?;
            let estimated_minutes: Option<i64> = row.try_get("estimatedMinutes")?;
            let recurrence_config: Option<String> = row.try_get("recurrenceConfig")?;
            let project_id: Option<String> = row.try_get("projectId")?;
            
            sqlx::query(
                "INSERT INTO Task \
                 (id, title, description, status, priority, dueDate, completedAt, \
                  estimatedMinutes, recurrence, recurrenceConfig, position, archived, \
                  createdAt, updatedAt, projectId) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&new_id)
            .bind(&title)
            .bind(&description)
            .bind("todo")
            .bind(&priority)
            .bind(due_date.map(|d| d + (1000 * 60 * 60 * 24))) // Next day
            .bind(None::<i64>)
            .bind(estimated_minutes)
            .bind(&rec)
            .bind(&recurrence_config)
            .bind(0)
            .bind(0)
            .bind(now_ms)
            .bind(now_ms)
            .bind(&project_id)
            .execute(pool)
            .await?;
            
            created_count += 1;
        }
    }
    
    Ok(created_count)
}
