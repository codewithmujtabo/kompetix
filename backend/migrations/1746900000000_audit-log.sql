-- Audit log: append-only record of every privileged write (admin / organizer / school_admin actions).
-- UU PDP compliance + incident forensics. Retained 5 years (see retention cron).

CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  user_role     TEXT,                         -- snapshot of role at time of action (in case role changes later)
  action        TEXT NOT NULL,                -- e.g. 'registration.approve', 'competition.create', 'user.delete'
  resource_type TEXT,                         -- e.g. 'registration', 'competition', 'user'
  resource_id   TEXT,                         -- ID of the resource acted on (TEXT to fit both UUID and TEXT PKs)
  ip            TEXT,
  user_agent    TEXT,
  payload       JSONB,                        -- request body / before-after diff (sanitized of secrets)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id     ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action      ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource    ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log(created_at DESC);
