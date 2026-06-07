mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_get_stats_endpoint() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Get stats - should return empty stats initially
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
    
    // Verify stats structure
    assert!(stats.get("tasks").is_some());
    assert!(stats.get("projects").is_some());
    assert!(stats.get("habits").is_some());
    assert!(stats.get("notes").is_some());
    assert!(stats.get("goals").is_some());
    
    // All counts should be 0 initially
    assert_eq!(stats["tasks"], 0);
    assert_eq!(stats["projects"], 0);
    assert_eq!(stats["habits"], 0);
    assert_eq!(stats["notes"], 0);
    assert_eq!(stats["goals"], 0);
}

#[tokio::test]
async fn test_stats_with_data() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create some tasks
    for i in 1..=3 {
        let body = json!({"title": format!("Task {}", i), "status": "todo"});
        app.clone()
            .oneshot(
                Request::builder()
                    .uri("/api/tasks")
                    .method("POST")
                    .header("content-type", "application/json")
                    .body(Body::from(serde_json::to_vec(&body).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();
    }

    // Create some notes
    for i in 1..=2 {
        let body = json!({"title": format!("Note {}", i), "content": "Test content"});
        app.clone()
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
    }

    // Get stats - should reflect created data
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
    
    assert_eq!(stats["tasks"], 3);
    assert_eq!(stats["notes"], 2);
}

#[tokio::test]
async fn test_export_data_endpoint() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create some test data
    let task_body = json!({"title": "Export Test Task", "status": "todo"});
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

    // Export data
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
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let export_data: Value = serde_json::from_slice(&body_bytes).unwrap();
    
    // Verify export structure
    assert!(export_data.get("tasks").is_some());
    assert!(export_data.get("projects").is_some());
    assert!(export_data.get("habits").is_some());
    assert!(export_data.get("notes").is_some());
    assert!(export_data.get("goals").is_some());
    assert!(export_data.get("exportDate").is_some());
    
    // Verify tasks were exported
    let tasks = export_data["tasks"].as_array().unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0]["title"], "Export Test Task");
}

#[tokio::test]
async fn test_import_data_endpoint() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Prepare import data
    let import_body = json!({
        "tasks": [
            {
                "id": "import_task_1",
                "title": "Imported Task",
                "status": "todo",
                "priority": "high",
                "createdAt": common::now_ms(),
                "updatedAt": common::now_ms()
            }
        ],
        "notes": [
            {
                "id": "import_note_1",
                "title": "Imported Note",
                "content": "Imported content",
                "pinned": false,
                "createdAt": common::now_ms(),
                "updatedAt": common::now_ms()
            }
        ],
        "projects": [],
        "habits": [],
        "goals": []
    });

    // Import data
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/data/import")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&import_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Verify imported data exists
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let tasks: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0]["title"], "Imported Task");

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let notes: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(notes.len(), 1);
    assert_eq!(notes[0]["title"], "Imported Note");
}

#[tokio::test]
async fn test_backup_and_restore() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create original data
    let task_body = json!({"title": "Backup Test", "status": "todo"});
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

    // Export (backup) data
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
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let backup_data: Value = serde_json::from_slice(&body_bytes).unwrap();

    // Delete the task
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let tasks: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    let task_id = tasks[0]["id"].as_str().unwrap();
    
    app.clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/tasks/{}", task_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Verify task is deleted
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let tasks: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(tasks.len(), 0);

    // Restore from backup
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/data/import")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&backup_data).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Verify data is restored
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let tasks: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert!(tasks.len() > 0);
}

#[tokio::test]
async fn test_clear_all_data() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create test data
    let task_body = json!({"title": "Test Task", "status": "todo"});
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

    let note_body = json!({"title": "Test Note", "content": "Content"});
    app.clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&note_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Verify data exists
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
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let stats: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert!(stats["tasks"].as_i64().unwrap() > 0);
    assert!(stats["notes"].as_i64().unwrap() > 0);

    // Clear all data
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/data/clear")
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Verify all data is cleared
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
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let stats: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(stats["tasks"], 0);
    assert_eq!(stats["notes"], 0);
}
