use serde::{Serialize, Serializer};

/// Prisma stores `DateTime` in SQLite as INTEGER milliseconds since the Unix
/// epoch (verified empirically against a Prisma-written row). This newtype
/// holds those raw milliseconds and serializes to the exact ISO-8601 string
/// shape Prisma emits over JSON, e.g. `2026-07-15T13:45:00.000Z`.
#[derive(Debug, Clone, Copy)]
pub struct PrismaDateTime(pub i64);

impl PrismaDateTime {
    pub fn now() -> Self {
        PrismaDateTime(chrono::Utc::now().timestamp_millis())
    }

    pub fn to_iso(self) -> String {
        chrono::DateTime::from_timestamp_millis(self.0)
            .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string())
            .unwrap_or_default()
    }
}

impl Serialize for PrismaDateTime {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_iso())
    }
}
