mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_project_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create a project
    let body = json!({
        "name": "Test Project",
        "description": "A test project",
        "color": "#ff0000",
        "status": "active"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/projects")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let project: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(project["name"], "Test Project");
    assert_eq!(project["color"], "#ff0000");
    let project_id = project["id"].as_str().unwrap();

    // Get project by ID
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/projects/{}", project_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let fetched: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(fetched["id"], project_id);
    assert_eq!(fetched["name"], "Test Project");

    // Update project
    let update_body = json!({"name": "Updated Project", "status": "on-hold"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/projects/{}", project_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated["name"], "Updated Project");
    assert_eq!(updated["status"], "on-hold");

    // Delete project
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/projects/{}", project_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Verify deletion
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/projects/{}", project_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_project_list_filtering() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create projects with different statuses
    let statuses = vec!["active", "on-hold", "completed"];
    for status in &statuses {
        let body = json!({"name": format!("Project {}", status), "status": status});
        app.clone()
            .oneshot(
                Request::builder()
                    .uri("/api/projects")
                    .method("POST")
                    .header("content-type", "application/json")
                    .body(Body::from(serde_json::to_vec(&body).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();
    }

    // List all projects
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/projects")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let projects: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(projects.len(), 3);

    // Filter by status
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/projects?status=active")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let projects: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0]["status"], "active");
}

#[tokio::test]
async fn test_project_validation() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Missing name
    let body = json!({"description": "No name"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/projects")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let error: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert!(error["error"].as_str().unwrap().contains("Name"));
}

#[tokio::test]
async fn test_project_task_count() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create a project
    let body = json!({"name": "Project with tasks"});
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/projects")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let project: Value = serde_json::from_slice(&body_bytes).unwrap();
    let project_id = project["id"].as_str().unwrap();

    // Create tasks associated with the project
    for i in 1..=3 {
        let task_body = json!({
            "title": format!("Task {}", i),
            "projectId": project_id
        });
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
    }

    // List projects and verify task count
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/projects")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let projects: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0]["_count"]["tasks"], 3);
}
