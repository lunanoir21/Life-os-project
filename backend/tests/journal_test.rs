mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_journal_crud_happy_path() {
    let (app, _temp_db) = common::setup_test_app().await;

    // 1. List journals - should be empty initially
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/journals")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let journals: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(journals.len(), 0);

    // 2. Create a journal entry
    let create_body = json!({
        "date": "2026-06-07",
        "content": "Today was a productive day",
        "mood": "happy",
        "tags": ["productive", "work"]
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/journals")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_journal: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_journal["content"], "Today was a productive day");
    assert_eq!(created_journal["mood"], "happy");
    let journal_id = created_journal["id"].as_str().unwrap();

    // 3. Get the journal by ID
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/journals/{}", journal_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let fetched_journal: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(fetched_journal["id"], journal_id);
    assert_eq!(fetched_journal["content"], "Today was a productive day");

    // 4. Update the journal
    let update_body = json!({
        "content": "Updated journal entry",
        "mood": "excited"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/journals/{}", journal_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_journal: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_journal["content"], "Updated journal entry");
    assert_eq!(updated_journal["mood"], "excited");

    // 5. List journals - should have 1 entry
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/journals")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let journals: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(journals.len(), 1);
    assert_eq!(journals[0]["content"], "Updated journal entry");

    // 6. Delete the journal
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/journals/{}", journal_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // 7. Get deleted journal - should return 404
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/journals/{}", journal_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_journal_create_validation() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Missing date should return 400
    let create_body = json!({
        "content": "Journal without date"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/journals")
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
    assert!(error["error"].as_str().unwrap().contains("date"));
}

#[tokio::test]
async fn test_journal_not_found() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Get non-existent journal
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/journals/nonexistent_id")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Update non-existent journal
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/journals/nonexistent_id")
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({"content": "Test"})).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Delete non-existent journal
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/journals/nonexistent_id")
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_journal_date_filtering() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create journals for different dates
    let dates = vec!["2026-06-01", "2026-06-07", "2026-06-15"];
    for date in &dates {
        let body = json!({
            "date": date,
            "content": format!("Entry for {}", date),
            "mood": "neutral"
        });
        app.clone()
            .oneshot(
                Request::builder()
                    .uri("/api/journals")
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
                .uri("/api/journals?startDate=2026-06-05&endDate=2026-06-10")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let journals: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    // Should only return the journal from 2026-06-07
    assert!(journals.iter().any(|j| j["date"].as_str().unwrap().contains("2026-06-07")));
}

#[tokio::test]
async fn test_journal_mood_filtering() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create journals with different moods
    let moods = vec!["happy", "sad", "neutral"];
    for mood in &moods {
        let body = json!({
            "date": "2026-06-07",
            "content": format!("Feeling {}", mood),
            "mood": mood
        });
        app.clone()
            .oneshot(
                Request::builder()
                    .uri("/api/journals")
                    .method("POST")
                    .header("content-type", "application/json")
                    .body(Body::from(serde_json::to_vec(&body).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();
    }

    // Filter by mood
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/journals?mood=happy")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let journals: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert!(journals.iter().all(|j| j["mood"] == "happy"));
}
