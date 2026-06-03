use serde_json::Value;
use sqlx::Row;

// ---------------------------------------------------------------------------
// ID + timestamp generation
// ---------------------------------------------------------------------------

pub fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

pub fn gen_id() -> String {
    cuid::cuid1().unwrap_or_else(|_| uuid_fallback())
}

fn uuid_fallback() -> String {
    format!(
        "c{:x}",
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
    )
}

// ---------------------------------------------------------------------------
// DateTime helpers
// ---------------------------------------------------------------------------

/// Parse an ISO string or numeric milliseconds to epoch-ms.
pub fn value_to_ms(v: &Value) -> Option<i64> {
    match v {
        Value::String(s) if !s.is_empty() => chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|dt| dt.timestamp_millis()),
        Value::Number(n) => n.as_i64(),
        _ => None,
    }
}

/// `body[key] ? new Date(value) : null`
pub fn opt_ms(body: &Value, key: &str) -> Option<i64> {
    body.get(key).and_then(|v| value_to_ms(v))
}

/// Parse a `YYYY-MM-DD` string to midnight-UTC milliseconds (for HabitLog date).
pub fn parse_day_ms(s: &str) -> Option<i64> {
    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
        .ok()
        .and_then(|d| d.and_hms_opt(0, 0, 0))
        .map(|dt| dt.and_utc().timestamp_millis())
}

// ---------------------------------------------------------------------------
// Body-parsing helpers (replicating Next.js coercion rules)
// ---------------------------------------------------------------------------

/// `value || null` — empty string → None.
pub fn truthy_str(body: &Value, key: &str) -> Option<String> {
    body.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

/// `value || 'default'` — empty / missing → default.
pub fn str_or<'a>(body: &'a Value, key: &str, default: &'a str) -> String {
    body.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or(default)
        .to_string()
}

/// `value || null` for numbers — 0 is falsy in JS.
pub fn truthy_i64(body: &Value, key: &str) -> Option<i64> {
    match body.get(key).and_then(|v| v.as_i64()) {
        Some(0) | None => None,
        v => v,
    }
}

pub fn truthy_f64(body: &Value, key: &str) -> Option<f64> {
    match body.get(key).and_then(|v| v.as_f64()) {
        Some(v) if v != 0.0 => Some(v),
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// PATCH presence helpers — outer Some = key was present in body
// (mirrors `if (field !== undefined)` in the Next.js PATCH handlers)
// ---------------------------------------------------------------------------

pub fn patch_str(body: &Value, key: &str) -> Option<Option<String>> {
    body.get(key).map(|v| match v {
        Value::String(s) => Some(s.clone()),
        Value::Null => None,
        _ => None,
    })
}

pub fn patch_ms(body: &Value, key: &str) -> Option<Option<i64>> {
    body.get(key).map(value_to_ms)
}

pub fn patch_bool(body: &Value, key: &str) -> Option<bool> {
    body.get(key).and_then(|v| v.as_bool())
}

pub fn patch_i64(body: &Value, key: &str) -> Option<Option<i64>> {
    body.get(key).map(|v| v.as_i64())
}

pub fn patch_f64(body: &Value, key: &str) -> Option<Option<f64>> {
    body.get(key).map(|v| v.as_f64())
}

/// Read a REAL column that SQLite may have stored as INTEGER affinity.
pub fn row_f64(r: &sqlx::sqlite::SqliteRow, col: &str) -> f64 {
    r.try_get::<f64, _>(col)
        .or_else(|_| r.try_get::<i64, _>(col).map(|i| i as f64))
        .unwrap_or(0.0)
}

// ---------------------------------------------------------------------------
// Macro to build a dynamic `UPDATE … SET` clause.
// Usage inside a handler function (qb and first must be in scope):
//   push_set!(qb, first, "col = ", value);
// ---------------------------------------------------------------------------
#[macro_export]
macro_rules! push_set {
    ($qb:expr, $first:expr, $col:expr, $val:expr) => {{
        if !$first {
            $qb.push(", ");
        }
        $first = false;
        $qb.push($col).push_bind($val);
    }};
}
