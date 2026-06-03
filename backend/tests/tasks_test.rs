mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_task_crud_happy_path() {
    let (app, _temp_db) = common::setup_test_app().await;

    // 1. List tasks - should be empty initially
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
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let tasks: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(tasks.len(), 0);

    // 2. Create a task
    let create_body = json!({
        "title": "Test Task",
        "description": "Test description",
        "status": "todo",
        "priority": "high"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_task: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_task["title"], "Test Task");
    assert_eq!(created_task["status"], "todo");
    assert_eq!(created_task["priority"], "high");
    let task_id = created_task["id"].as_str().unwrap();

    // 3. Get the task by ID
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/tasks/{}", task_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let fetched_task: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(fetched_task["id"], task_id);
    assert_eq!(fetched_task["title"], "Test Task");

    // 4. Update the task
    let update_body = json!({
        "title": "Updated Task",
        "status": "in-progress",
        "priority": "medium"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/tasks/{}", task_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_task: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_task["title"], "Updated Task");
    assert_eq!(updated_task["status"], "in-progress");
    assert_eq!(updated_task["priority"], "medium");

    // 5. List tasks - should have 1 task
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
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let tasks: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0]["title"], "Updated Task");

    // 6. Delete the task
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/tasks/{}", task_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // 7. Get deleted task - should return 404
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/tasks/{}", task_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_task_create_validation() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Missing title should return 400
    let create_body = json!({
        "description": "No title",
        "status": "todo"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let error: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert!(error["error"].as_str().unwrap().contains("Title"));

    // Empty title should return 400
    let create_body = json!({
        "title": "",
        "status": "todo"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_task_not_found() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Get non-existent task
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks/nonexistent_id")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Update non-existent task
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks/nonexistent_id")
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({"title": "Test"})).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Delete non-existent task
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks/nonexistent_id")
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_task_filtering() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create tasks with different statuses
    let statuses = vec!["todo", "in-progress", "done"];
    for status in &statuses {
        let body = json!({"title": format!("Task {}", status), "status": status});
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

    // Filter by status=todo
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks?status=todo")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let tasks: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0]["status"], "todo");

    // Filter by status=in-progress
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/tasks?status=in-progress")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let tasks: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0]["status"], "in-progress");
}

#[tokio::test]
async fn test_task_completion_updates_completed_at() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create a task
    let body = json!({"title": "Complete me", "status": "todo"});
    let response = app
        .clone()
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
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let task: Value = serde_json::from_slice(&body_bytes).unwrap();
    let task_id = task["id"].as_str().unwrap();
    assert!(task["completedAt"].is_null());

    // Mark as done
    let update_body = json!({"status": "done"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/tasks/{}", task_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_task: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_task["status"], "done");
    assert!(!updated_task["completedAt"].is_null());

    // Mark as todo again - completedAt should be null
    let update_body = json!({"status": "todo"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/tasks/{}", task_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_task: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_task["status"], "todo");
    assert!(updated_task["completedAt"].is_null());
}
