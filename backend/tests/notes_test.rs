mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_notes_crud_happy_path() {
    let (app, _temp_db) = common::setup_test_app().await;

    // 1. List notes - should be empty initially
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
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let notes: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(notes.len(), 0);

    // 2. Create a note
    let create_body = json!({
        "title": "Test Note",
        "content": "This is a test note content",
        "pinned": false
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_note: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_note["title"], "Test Note");
    assert_eq!(created_note["content"], "This is a test note content");
    assert_eq!(created_note["pinned"], false);
    let note_id = created_note["id"].as_str().unwrap();

    // 3. Get the note by ID
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
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let fetched_note: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(fetched_note["id"], note_id);
    assert_eq!(fetched_note["title"], "Test Note");

    // 4. Update the note
    let update_body = json!({
        "title": "Updated Note",
        "content": "Updated content",
        "pinned": true
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/notes/{}", note_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_note: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_note["title"], "Updated Note");
    assert_eq!(updated_note["content"], "Updated content");
    assert_eq!(updated_note["pinned"], true);

    // 5. List notes - should have 1 note
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
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let notes: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(notes.len(), 1);
    assert_eq!(notes[0]["title"], "Updated Note");

    // 6. Delete the note
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

    // 7. Get deleted note - should return 404
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
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_notes_create_validation() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Missing title should return 400
    let create_body = json!({
        "content": "Content without title"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes")
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
        "content": "Some content"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes")
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
async fn test_notes_not_found() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Get non-existent note
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes/nonexistent_id")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Update non-existent note
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes/nonexistent_id")
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

    // Delete non-existent note
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes/nonexistent_id")
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_notes_pinned_filtering() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create pinned and unpinned notes
    let pinned_note = json!({"title": "Pinned Note", "content": "Important", "pinned": true});
    let unpinned_note = json!({"title": "Regular Note", "content": "Normal", "pinned": false});

    app.clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&pinned_note).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    app.clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&unpinned_note).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Filter by pinned=true
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/notes?pinned=true")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let notes: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert!(notes.iter().all(|n| n["pinned"] == true));
}
