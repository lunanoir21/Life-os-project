mod common;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn test_finance_account_crud_happy_path() {
    let (app, _temp_db) = common::setup_test_app().await;

    // 1. List accounts - should be empty initially
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/accounts")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let accounts: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(accounts.len(), 0);

    // 2. Create an account
    let create_body = json!({
        "name": "Checking Account",
        "type": "checking",
        "balance": 1000.50,
        "currency": "USD"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/accounts")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_account: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_account["name"], "Checking Account");
    assert_eq!(created_account["type"], "checking");
    let account_id = created_account["id"].as_str().unwrap();

    // 3. Get the account by ID
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
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let fetched_account: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(fetched_account["id"], account_id);
    assert_eq!(fetched_account["name"], "Checking Account");

    // 4. Update the account
    let update_body = json!({
        "name": "Updated Checking",
        "balance": 2000.75
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/finance/accounts/{}", account_id))
                .method("PATCH")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let updated_account: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(updated_account["name"], "Updated Checking");

    // 5. List accounts - should have 1 account
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/accounts")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let accounts: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(accounts.len(), 1);
    assert_eq!(accounts[0]["name"], "Updated Checking");
}

#[tokio::test]
async fn test_finance_transaction_crud_happy_path() {
    let (app, _temp_db) = common::setup_test_app().await;

    // First create an account
    let account_body = json!({
        "name": "Test Account",
        "type": "checking",
        "balance": 5000.0,
        "currency": "USD"
    });
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

    // 1. List transactions - should be empty initially
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/transactions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let transactions: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(transactions.len(), 0);

    // 2. Create a transaction
    let create_body = json!({
        "accountId": account_id,
        "type": "expense",
        "amount": 50.25,
        "description": "Coffee shop",
        "date": "2026-06-07"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/transactions")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_transaction: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_transaction["type"], "expense");
    assert_eq!(created_transaction["description"], "Coffee shop");
    let transaction_id = created_transaction["id"].as_str().unwrap();

    // 3. Get the transaction by ID
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/finance/transactions/{}", transaction_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let fetched_transaction: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(fetched_transaction["id"], transaction_id);
    assert_eq!(fetched_transaction["description"], "Coffee shop");

    // 4. Delete the transaction
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/finance/transactions/{}", transaction_id))
                .method("DELETE")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // 5. Get deleted transaction - should return 404
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/finance/transactions/{}", transaction_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_finance_account_validation() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Missing name should return 400
    let create_body = json!({
        "type": "checking",
        "balance": 1000.0
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/accounts")
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
    assert!(error["error"].as_str().unwrap().contains("name"));

    // Empty name should return 400
    let create_body = json!({
        "name": "",
        "type": "checking",
        "balance": 1000.0
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/accounts")
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
async fn test_finance_transaction_validation() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Missing accountId should return 400
    let create_body = json!({
        "type": "expense",
        "amount": 50.0,
        "description": "Test"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/transactions")
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
    assert!(error["error"].as_str().unwrap().contains("accountId"));
}

#[tokio::test]
async fn test_finance_category_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create a category
    let create_body = json!({
        "name": "Food & Dining",
        "type": "expense",
        "color": "green"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/categories")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_category: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_category["name"], "Food & Dining");
    assert_eq!(created_category["type"], "expense");

    // List categories
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/categories")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let categories: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(categories.len(), 1);
}

#[tokio::test]
async fn test_finance_budget_crud() {
    let (app, _temp_db) = common::setup_test_app().await;

    // Create a budget
    let create_body = json!({
        "name": "Monthly Groceries",
        "amount": 500.0,
        "period": "monthly",
        "startDate": "2026-06-01"
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/budgets")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let created_budget: Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(created_budget["name"], "Monthly Groceries");

    // List budgets
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/finance/budgets")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
    let budgets: Vec<Value> = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(budgets.len(), 1);
}
