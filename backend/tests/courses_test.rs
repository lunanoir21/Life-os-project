mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_courses_crud_happy_path() {
    let (app, _temp_db) = common::setup_test_app().await;

    // 1. List courses - should be empty initially
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let courses: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(courses.len(), 0);

    // 2. Create a course
    let create_body = json!({
        "title": "Advanced Rust Programming",
        "description": "Deep dive into Rust advanced concepts",
        "instructor": "John Doe",
        "status": "in-progress",
        "platform": "Udemy",
        "startDate": "2026-06-01",
        "progress": 0
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_course: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_course["title"], "Advanced Rust Programming");
    assert_eq!(created_course["instructor"], "John Doe");
    assert_eq!(created_course["status"], "in-progress");
    let course_id = created_course["id"].as_str().unwrap();

    // 3. Get the course by ID
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/courses/{}", course_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let fetched_course: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(fetched_course["id"], course_id);
    assert_eq!(fetched_course["title"], "Advanced Rust Programming");

    // 4. Update the course
    let update_body = json!({
        "title": "Mastering Rust",
        "progress": 50,
        "status": "in-progress"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/courses/{}", course_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_course: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_course["title"], "Mastering Rust");
    assert_eq!(updated_course["progress"], 50);

    // 5. List courses - should have 1 course
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let courses: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(courses.len(), 1);
    assert_eq!(courses[0]["title"], "Mastering Rust");

    // 6. Delete the course
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

    // 7. Get deleted course - should return 404
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/courses/{}", course_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_courses_create_validation() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Missing title should return 400
    let create_body = json!({
        "description": "Course without title",
        "instructor": "Jane Doe"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses")
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
        "instructor": "Jane Doe"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses")
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
async fn test_courses_not_found() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Get non-existent course
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses/nonexistent_id")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Update non-existent course
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses/nonexistent_id")
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

    // Delete non-existent course
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses/nonexistent_id")
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_courses_status_filtering() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create courses with different statuses
    let statuses = vec!["not-started", "in-progress", "completed"];
    for status in &statuses {
        let body = json!({
            "title": format!("Course {}", status),
            "instructor": "Test Instructor",
            "status": status
        });
        app.clone()
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
    }

    // Filter by status=in-progress
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses?status=in-progress")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let courses: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert!(courses.iter().all(|c| c["status"] == "in-progress"));
}

#[tokio::test]
async fn test_courses_progress_tracking() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create a course with initial progress
    let create_body = json!({
        "title": "JavaScript Basics",
        "instructor": "Test Instructor",
        "status": "in-progress",
        "progress": 25
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let course: Value = serde_json::from_slice(&body_bytes).unwrap();
    let course_id = course["id"].as_str().unwrap();
    assert_eq!(course["progress"], 25);

    // Update progress
    let update_body = json!({
        "progress": 100,
        "status": "completed"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/courses/{}", course_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_course: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_course["progress"], 100);
    assert_eq!(updated_course["status"], "completed");
}

#[tokio::test]
async fn test_courses_platform_filtering() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create courses on different platforms
    let platforms = vec!["Udemy", "Coursera", "Pluralsight"];
    for platform in &platforms {
        let body = json!({
            "title": format!("Course on {}", platform),
            "instructor": "Test Instructor",
            "platform": platform
        });
        app.clone()
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
    }

    // Filter by platform
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/courses?platform=Udemy")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let courses: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert!(courses.iter().all(|c| c["platform"] == "Udemy"));
}
