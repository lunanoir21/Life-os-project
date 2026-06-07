mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_habit_crud_and_logging() {
    let (app, _temp_db) = common::setup_test_app().await;

    // 1. List habits - should be empty initially
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/habits")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let habits: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(habits.len(), 0);

    // 2. Create a habit
    let create_body = json!({
        "name": "Drink Water",
        "description": "Drink at least 2L of water",
        "color": "blue",
        "frequency": "daily",
        "targetCount": 8,
        "unit": "glasses"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/habits")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_habit: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_habit["name"], "Drink Water");
    let habit_id = created_habit["id"].as_str().unwrap();

    // 3. Log the habit
    let log_body = json!({
        "habitId": habit_id,
        "date": "2026-06-06",
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

    // 4. List habit logs
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
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let logs: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(logs.len(), 1);
    assert_eq!(logs[0]["habitId"], habit_id);
    assert_eq!(logs[0]["count"], 1);
}
