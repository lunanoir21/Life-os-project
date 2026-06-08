// Comprehensive integration tests for all backend modules
mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

// ============================================================================
// NOTES MODULE TESTS
// ============================================================================

#[tokio::test]
async fn test_notes_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create note
    let body = json!({"title": "Test Note", "content": "Note content"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let note: Value = serde_json::from_slice(&body_bytes).unwrap();
    let note_id = note["id"].as_str().unwrap();

    // Get note
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/notes/{}", note_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Update note
    let update = json!({"title": "Updated Note"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/notes/{}", note_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Delete note
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/notes/{}", note_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// HABITS MODULE TESTS
// ============================================================================

#[tokio::test]
async fn test_habits_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create habit
    let body = json!({"name": "Exercise", "frequency": "daily", "targetCount": 1});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/habits")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let habit: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(habit["name"], "Exercise");
    let habit_id = habit["id"].as_str().unwrap();

    // Get habit
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/habits/{}", habit_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Update habit
    let update = json!({"name": "Daily Exercise"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/habits/{}", habit_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_habit_logs_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // First create a habit
    let habit_body = json!({"name": "Read", "frequency": "daily"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/habits")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&habit_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let habit: Value = serde_json::from_slice(&body_bytes).unwrap();
    let habit_id = habit["id"].as_str().unwrap();

    // Create habit log (date should be YYYY-MM-DD format)
    let log_body = json!({
        "habitId": habit_id,
        "date": "2024-01-15",
        "count": 1
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/habit-logs")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&log_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);

    // List habit logs
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/habit-logs")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// GOALS MODULE TESTS
// ============================================================================

#[tokio::test]
async fn test_goals_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create goal
    let body = json!({
        "title": "Learn Rust",
        "category": "education",
        "status": "in-progress",
        "progress": 25
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/goals")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let goal: Value = serde_json::from_slice(&body_bytes).unwrap();
    let goal_id = goal["id"].as_str().unwrap();

    // Update goal progress
    let update = json!({"progress": 50});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/goals/{}", goal_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated["progress"], 50);

    // Delete goal
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/goals/{}", goal_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// JOURNAL MODULE TESTS
// ============================================================================

#[tokio::test]
async fn test_journal_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create journal entry
    let body = json!({
        "title": "My Day",
        "content": "Today was great!",
        "mood": "good",
        "moodScore": 4
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/journal")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let entry: Value = serde_json::from_slice(&body_bytes).unwrap();
    let entry_id = entry["id"].as_str().unwrap();

    // Get entry
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/journal/{}", entry_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Delete entry
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/journal/{}", entry_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// EVENTS MODULE TESTS
// ============================================================================

#[tokio::test]
async fn test_events_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create event
    let body = json!({
        "title": "Team Meeting",
        "startDate": "2024-06-15T10:00:00Z",
        "endDate": "2024-06-15T11:00:00Z",
        "allDay": false
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let event: Value = serde_json::from_slice(&body_bytes).unwrap();
    let event_id = event["id"].as_str().unwrap();

    // Update event
    let update = json!({"title": "Team Standup"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/events/{}", event_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Delete event
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/events/{}", event_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// TIME ENTRIES MODULE TESTS
// ============================================================================

#[tokio::test]
async fn test_time_entries_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create time entry
    let body = json!({
        "description": "Working on tests",
        "startTime": "2024-06-04T09:00:00Z"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/time-entries")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let entry: Value = serde_json::from_slice(&body_bytes).unwrap();
    let entry_id = entry["id"].as_str().unwrap();

    // Stop time entry (PATCH to /api/time-entries with id in body)
    let stop_body = json!({"id": entry_id, "endTime": "2024-06-04T10:00:00Z"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/time-entries")
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&stop_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Delete time entry
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/time-entries/{}", entry_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// POMODORO MODULE TESTS
// ============================================================================

#[tokio::test]
async fn test_pomodoro_sessions() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create pomodoro session
    let body = json!({
        "type": "focus",
        "duration": 1500,
        "completed": false
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/pomodoro-sessions")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let session: Value = serde_json::from_slice(&body_bytes).unwrap();
    let session_id = session["id"].as_str().unwrap();

    // Mark as completed
    let update = json!({"completed": true});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/pomodoro-sessions/{}", session_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Delete session
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/pomodoro-sessions/{}", session_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// COURSES MODULE TESTS
// ============================================================================

#[tokio::test]
async fn test_courses_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create course
    let body = json!({
        "title": "Rust Programming",
        "provider": "Udemy",
        "status": "in-progress",
        "progress": 30
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let course: Value = serde_json::from_slice(&body_bytes).unwrap();
    let course_id = course["id"].as_str().unwrap();

    // Update progress
    let update = json!({"progress": 60});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/courses/{}", course_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Delete course
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/courses/{}", course_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// FINANCE MODULE TESTS
// ============================================================================

#[tokio::test]
async fn test_finance_accounts_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create account
    let body = json!({
        "name": "Checking Account",
        "type": "checking",
        "balance": 1000.0,
        "currency": "USD"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/accounts")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let account: Value = serde_json::from_slice(&body_bytes).unwrap();
    let account_id = account["id"].as_str().unwrap();

    // Get account
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/finance/accounts/{}", account_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Update balance
    let update = json!({"balance": 1500.0});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/finance/accounts/{}", account_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_finance_transactions() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create account first
    let account_body = json!({"name": "Savings", "type": "savings"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/accounts")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&account_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let account: Value = serde_json::from_slice(&body_bytes).unwrap();
    let account_id = account["id"].as_str().unwrap();

    // Create transaction
    let txn_body = json!({
        "accountId": account_id,
        "amount": 50.0,
        "description": "Groceries",
        "type": "expense",
        "date": "2024-06-04T00:00:00Z"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/transactions")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&txn_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let txn: Value = serde_json::from_slice(&body_bytes).unwrap();
    let txn_id = txn["id"].as_str().unwrap();

    // Delete transaction
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/finance/transactions/{}", txn_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// TAGS & NOTE FOLDERS TESTS
// ============================================================================

#[tokio::test]
async fn test_tags_and_note_folders() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create tag
    let tag_body = json!({"name": "Work", "color": "#ff0000"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tags")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&tag_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);

    // List tags
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tags")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Create note folder
    let folder_body = json!({"name": "Projects"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/note-folders")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&folder_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);

    // List note folders
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/note-folders")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// PROFILE MODULE TESTS
// ============================================================================

#[tokio::test]
async fn test_profile_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create profile
    let body = json!({
        "name": "Test User",
        "email": "test@example.com",
        "timezone": "America/New_York"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/profile")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);

    // Get profile
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/profile")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Update profile
    let update = json!({"name": "Updated User"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/profile")
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// ANALYTICS & AGGREGATION TESTS
// ============================================================================

#[tokio::test]
async fn test_dashboard_endpoint() {
    let (app, _temp_db) = common::setup_test_app().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/dashboard")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let dashboard: Value = serde_json::from_slice(&body_bytes).unwrap();
    // Dashboard should return an object with stats
    assert!(dashboard.is_object());
}

#[tokio::test]
async fn test_analytics_endpoint() {
    let (app, _temp_db) = common::setup_test_app().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/analytics")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_weekly_review_endpoint() {
    let (app, _temp_db) = common::setup_test_app().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/weekly-review")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_activity_endpoint() {
    let (app, _temp_db) = common::setup_test_app().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/activity")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_search_endpoint() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create some searchable content
    let task_body = json!({"title": "Find this task"});
    app.clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&task_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Search for it
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/search?q=Find")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

// ============================================================================
// DATA MANAGEMENT TESTS
// ============================================================================

#[tokio::test]
async fn test_data_stats() {
    let (app, _temp_db) = common::setup_test_app().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/data/stats")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let stats: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert!(stats.is_object());
}

#[tokio::test]
async fn test_data_export() {
    let (app, _temp_db) = common::setup_test_app().await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/data/export")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}
