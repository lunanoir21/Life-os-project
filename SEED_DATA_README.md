# Seed Data Script

Bu dosya Life OS veritabanına örnek veri eklemek için kullanılır.

## Kullanım

Veritabanına örnek veri eklemek için:

```bash
sqlite3 prisma/dev.db < scripts/seed-data.sql
```

## Eklenen Veriler

### Calendar Events (11 adet)
- ✅ **4 Recurring Event:**
  - Daily: Morning standup (her gün saat 9:00)
  - Weekly: Team meeting (her Pazartesi saat 14:00)
  - Monthly: Performance review (her ayın son günü)
  - Weekly: Proje toplantısı (haftalık)

- ✅ **7 One-time Event:**
  - Bugün: Lunch meeting
  - Yarın: Dentist appointment
  - 3 gün sonra: Birthday party
  - 14 gün sonra: Vacation (all-day)
  - 30 gün sonra: Tech conference (all-day)

### Tasks (4 adet)
- Project proposal (high priority, 2 gün içinde)
- Code review (daily recurring)
- Weekly report (weekly recurring)
- Documentation update (low priority, 7 gün içinde)

### Habits (3 adet)
- Morning Exercise (günlük, 1 gün gap forgiveness)
- Read for 30 minutes (günlük)
- Weekly Review (haftalık)

### Finance (2 hesap + 3 kategori)
- **Hesaplar:**
  - Main Checking: $5,420.50
  - Emergency Fund: $15,000.00
- **Kategoriler:**
  - Groceries (expense)
  - Transportation (expense)
  - Salary (income)

### Goals (2 adet)
- Learn Spanish (35% complete, 6 ay içinde)
- Save for vacation (60% complete, 4 ay içinde)

### Notes (2 adet)
- Meeting Notes - Q1 Planning
- Project Ideas

### Journal (1 adet)
- Today's productive day entry

## Veritabanını Sıfırlama

Tüm verileri silmek için:

```bash
# Backend API üzerinden
curl -X POST http://localhost:3001/api/data/reset

# Veya doğrudan SQL ile
sqlite3 prisma/dev.db "DELETE FROM CalendarEvent; DELETE FROM Task; DELETE FROM Habit; DELETE FROM Goal; DELETE FROM Note; DELETE FROM JournalEntry; DELETE FROM Transaction; DELETE FROM FinanceAccount; DELETE FROM TransactionCategory;"
```

## Recurring Events Testi

Recurring event'lerin doğru çalıştığını test etmek için:

1. Frontend'i çalıştırın: `npm run dev`
2. Backend'i çalıştırın: `cd backend && cargo run`
3. Takvim sayfasına gidin: http://localhost:3000
4. Bir ay ileri/geri gidin
5. Recurring event'lerin her gün/hafta/ay tekrarlandığını göreceksiniz

## Sorun Giderme

### "No such table" hatası
```bash
# Migration'ları çalıştırın
cd prisma
npx prisma migrate dev
```

### Boş veritabanı
```bash
# Seed script'i tekrar çalıştırın
sqlite3 prisma/dev.db < scripts/seed-data.sql
```

### Backend bağlantı hatası
```bash
# Backend'in çalıştığından emin olun
cd backend
cargo run

# .env dosyasında DATABASE_URL'in doğru olduğundan emin olun
# DATABASE_URL="file:../prisma/dev.db"
```
