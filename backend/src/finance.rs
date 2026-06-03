use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use serde_json::Value;
use sqlx::{QueryBuilder, Row, Sqlite, SqlitePool};
use std::collections::HashMap;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::utils::*;
use crate::AppState;

// ============================================
// ACCOUNTS
// ============================================

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TransactionCount {
    transactions: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountBasic {
    id: String,
    name: String,
    r#type: String,
    balance: f64,
    currency: String,
    color: Option<String>,
    icon: Option<String>,
    is_default: bool,
    archived: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    #[serde(rename = "_count")]
    count: TransactionCount,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CategoryMini {
    id: String,
    name: String,
    icon: Option<String>,
    color: String,
    r#type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TxnInAccount {
    id: String,
    amount: f64,
    description: String,
    r#type: String,
    date: PrismaDateTime,
    note: Option<String>,
    is_recurring: bool,
    recurrence: Option<String>,
    account_id: String,
    category_id: Option<String>,
    transfer_to_id: Option<String>,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    category: Option<CategoryMini>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountDetail {
    id: String,
    name: String,
    r#type: String,
    balance: f64,
    currency: String,
    color: Option<String>,
    icon: Option<String>,
    is_default: bool,
    archived: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    #[serde(rename = "_count")]
    count: TransactionCount,
    transactions: Vec<TxnInAccount>,
}

fn account_basic_from_row(
    r: &sqlx::sqlite::SqliteRow,
    count: i64,
) -> Result<AccountBasic, sqlx::Error> {
    Ok(AccountBasic {
        id: r.try_get("id")?,
        name: r.try_get("name")?,
        r#type: r.try_get("type")?,
        balance: crate::utils::row_f64(r, "balance"),
        currency: r.try_get("currency")?,
        color: r.try_get("color")?,
        icon: r.try_get("icon")?,
        is_default: r.try_get::<i64, _>("isDefault")? != 0,
        archived: r.try_get::<i64, _>("archived")? != 0,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        count: TransactionCount {
            transactions: count,
        },
    })
}

pub async fn list_accounts(
    State(st): State<AppState>,
) -> Result<Json<Vec<AccountBasic>>, AppError> {
    let rows = sqlx::query("SELECT * FROM FinanceAccount ORDER BY createdAt DESC")
        .fetch_all(&st.db)
        .await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let id: String = r.try_get("id")?;
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM \"Transaction\" WHERE accountId = ?")
                .bind(&id)
                .fetch_one(&st.db)
                .await?;
        out.push(account_basic_from_row(r, count)?);
    }
    Ok(Json(out))
}

pub async fn create_account(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<AccountBasic>), AppError> {
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Name is required".to_string()))?
        .to_string();
    let id = gen_id();
    let now = now_ms();
    sqlx::query(
        "INSERT INTO FinanceAccount (id, name, type, balance, currency, color, icon, isDefault, archived, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&name)
    .bind(str_or(&body, "type", "checking"))
    .bind(body.get("balance").and_then(|v| v.as_f64()).unwrap_or(0.0))
    .bind(str_or(&body, "currency", "USD"))
    .bind(truthy_str(&body, "color")).bind(truthy_str(&body, "icon"))
    .bind(if body.get("isDefault").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
    .bind(0_i64).bind(now).bind(now)
    .execute(&st.db).await?;
    let row = sqlx::query("SELECT * FROM FinanceAccount WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    Ok((StatusCode::CREATED, Json(account_basic_from_row(&row, 0)?)))
}

pub async fn get_account(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<AccountDetail>, AppError> {
    let row = sqlx::query("SELECT * FROM FinanceAccount WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Account not found".to_string()))?;
    let txn_rows = sqlx::query(
        "SELECT * FROM \"Transaction\" WHERE accountId = ? ORDER BY date DESC LIMIT 20",
    )
    .bind(&id)
    .fetch_all(&st.db)
    .await?;
    let count = txn_rows.len() as i64; // quick count for limit-20 list
    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM \"Transaction\" WHERE accountId = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let mut transactions = Vec::new();
    for tr in &txn_rows {
        let cat = fetch_category_mini(
            &st.db,
            tr.try_get::<Option<String>, _>("categoryId")?.as_deref(),
        )
        .await?;
        transactions.push(txn_in_account_from_row(tr, cat)?);
    }
    let _ = count;
    Ok(Json(AccountDetail {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
        r#type: row.try_get("type")?,
        balance: crate::utils::row_f64(&row, "balance"),
        currency: row.try_get("currency")?,
        color: row.try_get("color")?,
        icon: row.try_get("icon")?,
        is_default: row.try_get::<i64, _>("isDefault")? != 0,
        archived: row.try_get::<i64, _>("archived")? != 0,
        created_at: PrismaDateTime(row.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(row.try_get::<i64, _>("updatedAt")?),
        count: TransactionCount {
            transactions: total,
        },
        transactions,
    }))
}

pub async fn update_account(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<AccountBasic>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM FinanceAccount WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Account not found".to_string()));
    }
    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE FinanceAccount SET ");
    let mut first = true;
    if let Some(v) = body.get("name").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "name = ", v.to_string());
    }
    if let Some(v) = body.get("type").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "type = ", v.to_string());
    }
    if let Some(v) = body.get("balance").and_then(|v| v.as_f64()) {
        crate::push_set!(qb, first, "balance = ", v);
    }
    if let Some(v) = body.get("currency").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "currency = ", v.to_string());
    }
    if let Some(v) = patch_str(&body, "color") {
        crate::push_set!(qb, first, "color = ", v);
    }
    if let Some(v) = patch_str(&body, "icon") {
        crate::push_set!(qb, first, "icon = ", v);
    }
    if let Some(v) = patch_bool(&body, "isDefault") {
        crate::push_set!(qb, first, "isDefault = ", if v { 1_i64 } else { 0_i64 });
    }
    if let Some(v) = patch_bool(&body, "archived") {
        crate::push_set!(qb, first, "archived = ", if v { 1_i64 } else { 0_i64 });
    }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;
    let row = sqlx::query("SELECT * FROM FinanceAccount WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM \"Transaction\" WHERE accountId = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    Ok(Json(account_basic_from_row(&row, count)?))
}

// ============================================
// TRANSACTIONS
// ============================================

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountMini {
    id: String,
    name: String,
    r#type: String,
    color: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Transaction {
    id: String,
    amount: f64,
    description: String,
    r#type: String,
    date: PrismaDateTime,
    note: Option<String>,
    is_recurring: bool,
    recurrence: Option<String>,
    account_id: String,
    category_id: Option<String>,
    transfer_to_id: Option<String>,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    account: AccountMini,
    category: Option<CategoryMini>,
}

#[derive(Serialize)]
pub(crate) struct TxnList {
    transactions: Vec<Transaction>,
    total: i64,
}

async fn fetch_category_mini(
    db: &SqlitePool,
    id: Option<&str>,
) -> Result<Option<CategoryMini>, sqlx::Error> {
    let id = match id {
        Some(i) if !i.is_empty() => i,
        _ => return Ok(None),
    };
    let row =
        sqlx::query("SELECT id, name, icon, color, type FROM TransactionCategory WHERE id = ?")
            .bind(id)
            .fetch_optional(db)
            .await?;
    Ok(row.map(|r| CategoryMini {
        id: r.try_get("id").unwrap_or_default(),
        name: r.try_get("name").unwrap_or_default(),
        icon: r.try_get("icon").ok().flatten(),
        color: r.try_get("color").unwrap_or_default(),
        r#type: r.try_get("type").unwrap_or_default(),
    }))
}

fn txn_from_row(
    r: &sqlx::sqlite::SqliteRow,
    account: AccountMini,
    category: Option<CategoryMini>,
) -> Result<Transaction, sqlx::Error> {
    Ok(Transaction {
        id: r.try_get("id")?,
        amount: crate::utils::row_f64(r, "amount"),
        description: r.try_get("description")?,
        r#type: r.try_get("type")?,
        date: PrismaDateTime(r.try_get::<i64, _>("date")?),
        note: r.try_get("note")?,
        is_recurring: r.try_get::<i64, _>("isRecurring")? != 0,
        recurrence: r.try_get("recurrence")?,
        account_id: r.try_get("accountId")?,
        category_id: r.try_get("categoryId")?,
        transfer_to_id: r.try_get("transferToId")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        account,
        category,
    })
}

fn txn_in_account_from_row(
    r: &sqlx::sqlite::SqliteRow,
    category: Option<CategoryMini>,
) -> Result<TxnInAccount, sqlx::Error> {
    Ok(TxnInAccount {
        id: r.try_get("id")?,
        amount: crate::utils::row_f64(r, "amount"),
        description: r.try_get("description")?,
        r#type: r.try_get("type")?,
        date: PrismaDateTime(r.try_get::<i64, _>("date")?),
        note: r.try_get("note")?,
        is_recurring: r.try_get::<i64, _>("isRecurring")? != 0,
        recurrence: r.try_get("recurrence")?,
        account_id: r.try_get("accountId")?,
        category_id: r.try_get("categoryId")?,
        transfer_to_id: r.try_get("transferToId")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        category,
    })
}

async fn fetch_account_mini(db: &SqlitePool, id: &str) -> Result<AccountMini, sqlx::Error> {
    let r = sqlx::query("SELECT id, name, type, color FROM FinanceAccount WHERE id = ?")
        .bind(id)
        .fetch_one(db)
        .await?;
    Ok(AccountMini {
        id: r.try_get("id")?,
        name: r.try_get("name")?,
        r#type: r.try_get("type")?,
        color: r.try_get("color")?,
    })
}

pub async fn list_transactions(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<TxnList>, AppError> {
    let limit = params
        .get("limit")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(50);
    let offset = params
        .get("offset")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(0);

    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM \"Transaction\" WHERE 1=1");
    let mut cqb: QueryBuilder<Sqlite> =
        QueryBuilder::new("SELECT COUNT(*) FROM \"Transaction\" WHERE 1=1");

    if let Some(a) = params.get("accountId") {
        qb.push(" AND accountId = ").push_bind(a.clone());
        cqb.push(" AND accountId = ").push_bind(a.clone());
    }
    if let Some(c) = params.get("categoryId") {
        qb.push(" AND categoryId = ").push_bind(c.clone());
        cqb.push(" AND categoryId = ").push_bind(c.clone());
    }
    if let Some(t) = params.get("type") {
        qb.push(" AND type = ").push_bind(t.clone());
        cqb.push(" AND type = ").push_bind(t.clone());
    }
    if let Some(sd) = params.get("startDate") {
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(sd) {
            let ms = dt.timestamp_millis();
            qb.push(" AND date >= ").push_bind(ms);
            cqb.push(" AND date >= ").push_bind(ms);
        }
    }
    if let Some(ed) = params.get("endDate") {
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ed) {
            let ms = dt.timestamp_millis();
            qb.push(" AND date <= ").push_bind(ms);
            cqb.push(" AND date <= ").push_bind(ms);
        }
    }

    let total: i64 = cqb.build_query_scalar().fetch_one(&st.db).await?;
    qb.push(" ORDER BY date DESC LIMIT ")
        .push_bind(limit)
        .push(" OFFSET ")
        .push_bind(offset);
    let rows = qb.build().fetch_all(&st.db).await?;

    let mut transactions = Vec::with_capacity(rows.len());
    for r in &rows {
        let account_id: String = r.try_get("accountId")?;
        let account = fetch_account_mini(&st.db, &account_id).await?;
        let cat = fetch_category_mini(
            &st.db,
            r.try_get::<Option<String>, _>("categoryId")?.as_deref(),
        )
        .await?;
        transactions.push(txn_from_row(r, account, cat)?);
    }
    Ok(Json(TxnList {
        transactions,
        total,
    }))
}

pub async fn create_transaction(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Transaction>), AppError> {
    let amount = body
        .get("amount")
        .and_then(|v| v.as_f64())
        .ok_or_else(|| AppError::BadRequest("Amount is required".to_string()))?;
    let description = body
        .get("description")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Description is required".to_string()))?
        .to_string();
    let account_id = body
        .get("accountId")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("accountId is required".to_string()))?
        .to_string();
    let date_ms = opt_ms(&body, "date")
        .ok_or_else(|| AppError::BadRequest("Date is required".to_string()))?;
    let txn_type = body
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("expense")
        .to_string();

    let id = gen_id();
    let now = now_ms();
    sqlx::query(
        "INSERT INTO \"Transaction\" (id, amount, description, type, date, note, isRecurring, recurrence, accountId, categoryId, transferToId, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(amount).bind(&description).bind(&txn_type).bind(date_ms)
    .bind(truthy_str(&body, "note"))
    .bind(if body.get("isRecurring").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
    .bind(truthy_str(&body, "recurrence"))
    .bind(&account_id).bind(truthy_str(&body, "categoryId")).bind(truthy_str(&body, "transferToId"))
    .bind(now).bind(now)
    .execute(&st.db).await?;

    // Update account balance
    let balance_change: f64 = if txn_type == "income" {
        amount
    } else if txn_type == "expense" {
        -amount
    } else {
        0.0
    };
    if balance_change != 0.0 {
        sqlx::query("UPDATE FinanceAccount SET balance = balance + ?, updatedAt = ? WHERE id = ?")
            .bind(balance_change)
            .bind(now)
            .bind(&account_id)
            .execute(&st.db)
            .await?;
    }

    let row = sqlx::query("SELECT * FROM \"Transaction\" WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let account = fetch_account_mini(&st.db, &account_id).await?;
    let cat = fetch_category_mini(
        &st.db,
        row.try_get::<Option<String>, _>("categoryId")?.as_deref(),
    )
    .await?;
    Ok((StatusCode::CREATED, Json(txn_from_row(&row, account, cat)?)))
}

pub async fn get_transaction(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Transaction>, AppError> {
    let row = sqlx::query("SELECT * FROM \"Transaction\" WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Transaction not found".to_string()))?;
    let account_id: String = row.try_get("accountId")?;
    let account = fetch_account_mini(&st.db, &account_id).await?;
    let cat = fetch_category_mini(
        &st.db,
        row.try_get::<Option<String>, _>("categoryId")?.as_deref(),
    )
    .await?;
    Ok(Json(txn_from_row(&row, account, cat)?))
}

pub async fn delete_transaction(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let row = sqlx::query("SELECT * FROM \"Transaction\" WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Transaction not found".to_string()))?;
    let txn_type: String = row.try_get("type")?;
    let amount: f64 = crate::utils::row_f64(&row, "amount");
    let account_id: String = row.try_get("accountId")?;

    // Reverse balance change
    let balance_change: f64 = if txn_type == "income" {
        -amount
    } else if txn_type == "expense" {
        amount
    } else {
        0.0
    };
    let now = now_ms();
    if balance_change != 0.0 {
        sqlx::query("UPDATE FinanceAccount SET balance = balance + ?, updatedAt = ? WHERE id = ?")
            .bind(balance_change)
            .bind(now)
            .bind(&account_id)
            .execute(&st.db)
            .await?;
    }

    sqlx::query("DELETE FROM \"Transaction\" WHERE id = ?")
        .bind(&id)
        .execute(&st.db)
        .await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

// ============================================
// CATEGORIES
// ============================================

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CategoryCount {
    transactions: i64,
    budget_items: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Category {
    id: String,
    name: String,
    icon: Option<String>,
    color: String,
    r#type: String,
    is_system: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    #[serde(rename = "_count")]
    count: CategoryCount,
}

pub async fn list_categories(State(st): State<AppState>) -> Result<Json<Vec<Category>>, AppError> {
    let rows = sqlx::query("SELECT * FROM TransactionCategory ORDER BY name ASC")
        .fetch_all(&st.db)
        .await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let id: String = r.try_get("id")?;
        let txn_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM \"Transaction\" WHERE categoryId = ?")
                .bind(&id)
                .fetch_one(&st.db)
                .await?;
        let bi_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM BudgetItem WHERE categoryId = ?")
                .bind(&id)
                .fetch_one(&st.db)
                .await?;
        out.push(Category {
            id,
            name: r.try_get("name")?,
            icon: r.try_get("icon")?,
            color: r.try_get("color")?,
            r#type: r.try_get("type")?,
            is_system: r.try_get::<i64, _>("isSystem")? != 0,
            created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
            count: CategoryCount {
                transactions: txn_count,
                budget_items: bi_count,
            },
        });
    }
    Ok(Json(out))
}

pub async fn create_category(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Category>), AppError> {
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Name is required".to_string()))?
        .to_string();
    let id = gen_id();
    let now = now_ms();
    sqlx::query(
        "INSERT INTO TransactionCategory (id, name, icon, color, type, isSystem, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&name).bind(truthy_str(&body, "icon"))
    .bind(str_or(&body, "color", "#6b7280"))
    .bind(str_or(&body, "type", "expense"))
    .bind(if body.get("isSystem").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
    .bind(now).bind(now)
    .execute(&st.db).await?;
    let row = sqlx::query("SELECT * FROM TransactionCategory WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    Ok((
        StatusCode::CREATED,
        Json(Category {
            id,
            name: row.try_get("name")?,
            icon: row.try_get("icon")?,
            color: row.try_get("color")?,
            r#type: row.try_get("type")?,
            is_system: row.try_get::<i64, _>("isSystem")? != 0,
            created_at: PrismaDateTime(row.try_get::<i64, _>("createdAt")?),
            updated_at: PrismaDateTime(row.try_get::<i64, _>("updatedAt")?),
            count: CategoryCount {
                transactions: 0,
                budget_items: 0,
            },
        }),
    ))
}

// ============================================
// BUDGETS
// ============================================

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BudgetItem {
    id: String,
    budget_id: String,
    category_id: String,
    amount: f64,
    spent: f64,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    category: CategoryMini,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Budget {
    id: String,
    name: String,
    period: String,
    start_date: PrismaDateTime,
    end_date: Option<PrismaDateTime>,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    items: Vec<BudgetItem>,
}

async fn budget_items(db: &SqlitePool, budget_id: &str) -> Result<Vec<BudgetItem>, sqlx::Error> {
    let rows = sqlx::query("SELECT * FROM BudgetItem WHERE budgetId = ? ORDER BY createdAt ASC")
        .bind(budget_id)
        .fetch_all(db)
        .await?;
    let mut out = Vec::new();
    for r in &rows {
        let cat_id: String = r.try_get("categoryId")?;
        let cat = fetch_category_mini(db, Some(&cat_id))
            .await?
            .unwrap_or(CategoryMini {
                id: cat_id.clone(),
                name: "Unknown".to_string(),
                icon: None,
                color: "#6b7280".to_string(),
                r#type: "expense".to_string(),
            });
        out.push(BudgetItem {
            id: r.try_get("id")?,
            budget_id: r.try_get("budgetId")?,
            category_id: cat_id,
            amount: crate::utils::row_f64(r, "amount"),
            spent: crate::utils::row_f64(r, "spent"),
            created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
            category: cat,
        });
    }
    Ok(out)
}

pub async fn list_budgets(State(st): State<AppState>) -> Result<Json<Vec<Budget>>, AppError> {
    let rows = sqlx::query("SELECT * FROM Budget ORDER BY createdAt DESC")
        .fetch_all(&st.db)
        .await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let id: String = r.try_get("id")?;
        let items = budget_items(&st.db, &id).await?;
        out.push(Budget {
            id,
            name: r.try_get("name")?,
            period: r.try_get("period")?,
            start_date: PrismaDateTime(r.try_get::<i64, _>("startDate")?),
            end_date: r.try_get::<Option<i64>, _>("endDate")?.map(PrismaDateTime),
            created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
            items,
        });
    }
    Ok(Json(out))
}

pub async fn create_budget(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Budget>), AppError> {
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Name is required".to_string()))?
        .to_string();
    let start_ms = opt_ms(&body, "startDate")
        .ok_or_else(|| AppError::BadRequest("Start date is required".to_string()))?;
    let id = gen_id();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO Budget (id, name, period, startDate, endDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&name)
    .bind(str_or(&body, "period", "monthly"))
    .bind(start_ms).bind(opt_ms(&body, "endDate"))
    .bind(now).bind(now)
    .execute(&st.db).await?;

    if let Some(items_arr) = body.get("items").and_then(|v| v.as_array()) {
        for item in items_arr {
            let iid = gen_id();
            let cat_id = item
                .get("categoryId")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let amount = item.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
            sqlx::query(
                "INSERT INTO BudgetItem (id, budgetId, categoryId, amount, spent, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&iid).bind(&id).bind(&cat_id).bind(amount).bind(0.0_f64).bind(now).bind(now)
            .execute(&st.db).await?;
        }
    }

    let row = sqlx::query("SELECT * FROM Budget WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let items = budget_items(&st.db, &id).await?;
    Ok((
        StatusCode::CREATED,
        Json(Budget {
            id: row.try_get("id")?,
            name: row.try_get("name")?,
            period: row.try_get("period")?,
            start_date: PrismaDateTime(row.try_get::<i64, _>("startDate")?),
            end_date: row
                .try_get::<Option<i64>, _>("endDate")?
                .map(PrismaDateTime),
            created_at: PrismaDateTime(row.try_get::<i64, _>("createdAt")?),
            updated_at: PrismaDateTime(row.try_get::<i64, _>("updatedAt")?),
            items,
        }),
    ))
}
