mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_events_crud_happy_path() {
    let (app, _temp_db) = common::setup_test_app().await;

    // 1. List events - should be empty initially
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let events: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(events.len(), 0);

    // 2. Create an event
    let create_body = json!({
        "title": "Team Meeting",
        "description": "Weekly team sync",
        "startDate": "2026-06-10T10:00:00Z",
        "endDate": "2026-06-10T11:00:00Z",
        "location": "Conference Room A",
        "allDay": false
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_event: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_event["title"], "Team Meeting");
    assert_eq!(created_event["location"], "Conference Room A");
    let event_id = created_event["id"].as_str().unwrap();

    // 3. Get the event by ID
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/events/{}", event_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let fetched_event: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(fetched_event["id"], event_id);
    assert_eq!(fetched_event["title"], "Team Meeting");

    // 4. Update the event
    let update_body = json!({
        "title": "Team Standup",
        "location": "Conference Room B"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/events/{}", event_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_event: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_event["title"], "Team Standup");
    assert_eq!(updated_event["location"], "Conference Room B");

    // 5. List events - should have 1 event
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let events: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0]["title"], "Team Standup");

    // 6. Delete the event
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

    // 7. Get deleted event - should return 404
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/events/{}", event_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_events_create_validation() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Missing title should return 400
    let create_body = json!({
        "startDate": "2026-06-10T10:00:00Z",
        "endDate": "2026-06-10T11:00:00Z"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events")
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
        "startDate": "2026-06-10T10:00:00Z",
        "endDate": "2026-06-10T11:00:00Z"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events")
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
async fn test_events_not_found() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Get non-existent event
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events/nonexistent_id")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Update non-existent event
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events/nonexistent_id")
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

    // Delete non-existent event
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events/nonexistent_id")
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_events_all_day() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create an all-day event
    let create_body = json!({
        "title": "Conference",
        "startDate": "2026-06-15",
        "endDate": "2026-06-15",
        "allDay": true
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_event: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_event["title"], "Conference");
    assert_eq!(created_event["allDay"], true);
}

#[tokio::test]
async fn test_events_date_filtering() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create events for different dates
    let dates = vec![
        "2026-06-01T10:00:00Z",
        "2026-06-10T10:00:00Z",
        "2026-06-20T10:00:00Z",
    ];

    for (i, date) in dates.iter().enumerate() {
        let body = json!({
            "title": format!("Event {}", i + 1),
            "startDate": date,
            "endDate": date
        });
        app.clone()
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
    }

    // Filter by date range
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events?startDate=2026-06-05&endDate=2026-06-15")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let events: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    // Should return events within the date range
    assert!(events.len() >= 1);
}

#[tokio::test]
async fn test_events_recurring() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create a recurring event
    let create_body = json!({
        "title": "Weekly Meeting",
        "startDate": "2026-06-10T10:00:00Z",
        "endDate": "2026-06-10T11:00:00Z",
        "recurring": true,
        "recurrenceRule": "FREQ=WEEKLY;BYDAY=WE"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_event: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_event["title"], "Weekly Meeting");
    assert_eq!(created_event["recurring"], true);
}
