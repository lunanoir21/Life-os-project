mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_goals_crud_happy_path() {
    let (app, _temp_db) = common::setup_test_app().await;

    // 1. List goals - should be empty initially
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/goals")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let goals: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(goals.len(), 0);

    // 2. Create a goal
    let create_body = json!({
        "title": "Learn Rust",
        "description": "Master Rust programming language",
        "category": "learning",
        "targetDate": "2026-12-31",
        "status": "in-progress"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/goals")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_goal: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_goal["title"], "Learn Rust");
    assert_eq!(created_goal["status"], "in-progress");
    let goal_id = created_goal["id"].as_str().unwrap();

    // 3. Get the goal by ID
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/goals/{}", goal_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let fetched_goal: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(fetched_goal["id"], goal_id);
    assert_eq!(fetched_goal["title"], "Learn Rust");

    // 4. Update the goal
    let update_body = json!({
        "title": "Master Rust",
        "status": "completed",
        "progress": 100
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/goals/{}", goal_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_goal: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_goal["title"], "Master Rust");
    assert_eq!(updated_goal["status"], "completed");

    // 5. List goals - should have 1 goal
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/goals")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let goals: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(goals.len(), 1);
    assert_eq!(goals[0]["title"], "Master Rust");

    // 6. Delete the goal
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

    // 7. Get deleted goal - should return 404
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/goals/{}", goal_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_goals_create_validation() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Missing title should return 400
    let create_body = json!({
        "description": "Goal without title",
        "status": "not-started"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/goals")
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
    assert!(error["error"].as_str().unwrap().contains("title"));

    // Empty title should return 400
    let create_body = json!({
        "title": "",
        "status": "not-started"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/goals")
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
async fn test_goals_not_found() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Get non-existent goal
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/goals/nonexistent_id")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Update non-existent goal
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/goals/nonexistent_id")
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

    // Delete non-existent goal
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/goals/nonexistent_id")
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_goals_status_filtering() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create goals with different statuses
    let statuses = vec!["not-started", "in-progress", "completed"];
    for status in &statuses {
        let body = json!({
            "title": format!("Goal {}", status),
            "status": status
        });
        app.clone()
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
    }

    // Filter by status=in-progress
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/goals?status=in-progress")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let goals: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert!(goals.iter().all(|g| g["status"] == "in-progress"));
}

#[tokio::test]
async fn test_goals_progress_tracking() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create a goal with initial progress
    let create_body = json!({
        "title": "Read 12 books",
        "description": "Read one book per month",
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
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let goal: Value = serde_json::from_slice(&body_bytes).unwrap();
    let goal_id = goal["id"].as_str().unwrap();
    assert_eq!(goal["progress"], 25);

    // Update progress
    let update_body = json!({"progress": 75});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/goals/{}", goal_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_goal: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_goal["progress"], 75);
}
