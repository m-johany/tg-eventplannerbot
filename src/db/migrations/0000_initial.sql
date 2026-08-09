-- Initial schema: events and attendees tables
CREATE TABLE events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id       INTEGER NOT NULL,
  message_id    INTEGER,
  title         TEXT NOT NULL,
  description   TEXT,
  event_date    TEXT,
  location      TEXT,
  attendee_limit INTEGER,
  creator_id    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE attendees (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id  INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL,
  name      TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'going',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX unique_event_user ON attendees(event_id, user_id);
