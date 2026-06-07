-- Seed data for Life OS
-- This script adds sample data for testing and demo purposes

-- Calendar Events (with recurring examples)
INSERT OR IGNORE INTO CalendarEvent (id, title, description, startDate, endDate, allDay, color, location, recurrence, createdAt, updatedAt)
VALUES
  -- Daily recurring: Morning standup
  ('evt-daily-standup', 'Daily Standup', 'Team sync meeting', 
   strftime('%s', 'now', 'start of day', '+9 hours') * 1000,
   strftime('%s', 'now', 'start of day', '+9 hours', '+30 minutes') * 1000,
   0, '#8b5cf6', 'Zoom', 'daily',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  -- Weekly recurring: Team meeting
  ('evt-weekly-meeting', 'Weekly Team Meeting', 'Weekly planning and review',
   strftime('%s', 'now', 'start of day', 'weekday 1', '+14 hours') * 1000,
   strftime('%s', 'now', 'start of day', 'weekday 1', '+15 hours') * 1000,
   0, '#10b981', 'Office - Meeting Room A', 'weekly',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  -- Monthly recurring: Review meeting
  ('evt-monthly-review', 'Monthly Performance Review', 'One-on-one with manager',
   strftime('%s', 'now', 'start of month', '+1 month', '-1 day', '+10 hours') * 1000,
   strftime('%s', 'now', 'start of month', '+1 month', '-1 day', '+11 hours') * 1000,
   0, '#f59e0b', 'Office', 'monthly',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  -- One-time events
  ('evt-today-lunch', 'Lunch with Sarah', 'Catch up over lunch',
   strftime('%s', 'now', 'start of day', '+12 hours') * 1000,
   strftime('%s', 'now', 'start of day', '+13 hours') * 1000,
   0, '#ec4899', 'Downtown Restaurant', NULL,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('evt-tomorrow-dentist', 'Dentist Appointment', 'Regular checkup',
   strftime('%s', 'now', '+1 day', 'start of day', '+14 hours') * 1000,
   strftime('%s', 'now', '+1 day', 'start of day', '+15 hours') * 1000,
   0, '#06b6d4', 'Dr. Smith Dental Clinic', NULL,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('evt-weekend-birthday', 'Birthday Party', 'Alex turns 30!',
   strftime('%s', 'now', '+3 days', 'start of day', '+18 hours') * 1000,
   strftime('%s', 'now', '+3 days', 'start of day', '+22 hours') * 1000,
   0, '#f97316', 'Alex Place', NULL,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  -- All-day events
  ('evt-allday-vacation', 'Vacation', 'Beach holiday',
   strftime('%s', 'now', '+14 days', 'start of day') * 1000,
   NULL, 1, '#14b8a6', 'Hawaii', NULL,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('evt-allday-conference', 'Tech Conference', 'Annual developer conference',
   strftime('%s', 'now', '+30 days', 'start of day') * 1000,
   NULL, 1, '#6366f1', 'Convention Center', NULL,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Sample Tasks
INSERT OR IGNORE INTO Task (id, title, description, status, priority, dueDate, recurrence, createdAt, updatedAt)
VALUES
  ('task-1', 'Complete project proposal', 'Draft and submit Q1 project proposal', 'in-progress', 'high',
   strftime('%s', 'now', '+2 days') * 1000, NULL,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('task-2', 'Review code PRs', 'Review pending pull requests', 'todo', 'medium',
   strftime('%s', 'now', '+1 day') * 1000, 'daily',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('task-3', 'Weekly report', 'Submit weekly progress report', 'todo', 'medium',
   strftime('%s', 'now', 'weekday 5') * 1000, 'weekly',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('task-4', 'Update documentation', 'Update API documentation', 'todo', 'low',
   strftime('%s', 'now', '+7 days') * 1000, NULL,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Sample Notes
INSERT OR IGNORE INTO Note (id, title, content, type, createdAt, updatedAt)
VALUES
  ('note-1', 'Meeting Notes - Q1 Planning', '# Q1 Planning Meeting\n\n## Key Points\n- Focus on user experience improvements\n- Allocate resources for testing\n- Launch date: March 15', 'note',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('note-2', 'Project Ideas', '# New Project Ideas\n\n1. Mobile app redesign\n2. Performance optimization\n3. User onboarding improvements', 'idea',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Sample Habits
INSERT OR IGNORE INTO Habit (id, name, description, frequency, color, icon, targetCount, gapForgiveness, createdAt, updatedAt)
VALUES
  ('habit-1', 'Morning Exercise', 'Start the day with 30 min workout', 'daily', '#10b981', '💪', 1, 1,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('habit-2', 'Read for 30 minutes', 'Read books or articles', 'daily', '#8b5cf6', '📚', 1, 0,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('habit-3', 'Weekly Review', 'Review goals and progress', 'weekly', '#f59e0b', '📝', 1, 0,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Sample Finance Accounts
INSERT OR IGNORE INTO FinanceAccount (id, name, type, balance, currency, color, isDefault, createdAt, updatedAt)
VALUES
  ('acc-checking', 'Main Checking', 'checking', 5420.50, 'USD', '#10b981', 1,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('acc-savings', 'Emergency Fund', 'savings', 15000.00, 'USD', '#06b6d4', 0,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Sample Transaction Categories
INSERT OR IGNORE INTO TransactionCategory (id, name, type, color, icon, createdAt, updatedAt)
VALUES
  ('cat-groceries', 'Groceries', 'expense', '#10b981', '🛒',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('cat-transport', 'Transportation', 'expense', '#06b6d4', '🚗',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('cat-salary', 'Salary', 'income', '#8b5cf6', '💰',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Sample Goals
INSERT OR IGNORE INTO Goal (id, title, description, category, status, progress, targetDate, createdAt, updatedAt)
VALUES
  ('goal-1', 'Learn Spanish', 'Reach conversational fluency in Spanish', 'personal', 'in-progress', 35,
   strftime('%s', 'now', '+6 months') * 1000,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  ('goal-2', 'Save for vacation', 'Save $3000 for summer vacation', 'financial', 'in-progress', 60,
   strftime('%s', 'now', '+4 months') * 1000,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Sample Journal Entry
INSERT OR IGNORE INTO JournalEntry (id, title, content, mood, moodScore, energy, stress, date, createdAt, updatedAt)
VALUES
  ('journal-1', 'Productive Day', 'Had a great day at work. Completed the project milestone and received positive feedback from the team. Feeling accomplished!', 'good', 4, 4, 2,
   strftime('%s', 'now', 'start of day') * 1000,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- User Profile (if not exists)
INSERT OR IGNORE INTO UserProfile (id, name, email, setupComplete, createdAt, updatedAt)
VALUES
  ('user-1', 'Demo User', 'demo@lifeos.app', 1,
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Settings (if not exists)
INSERT OR IGNORE INTO Settings (id, userId, currency, dateFormat, timeFormat, createdAt, updatedAt)
VALUES
  ('settings-1', 'user-1', 'USD', 'yyyy-MM-dd', '24h',
   strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);
