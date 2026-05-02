-- Migration: create-competition-views
-- Sprint 4, Track A (T1)
-- Creates table to track when users view competition details

CREATE TABLE IF NOT EXISTS competition_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comp_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  view_duration_seconds INTEGER DEFAULT 0
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_competition_views_user ON competition_views(user_id);
CREATE INDEX IF NOT EXISTS idx_competition_views_comp ON competition_views(comp_id);
CREATE INDEX IF NOT EXISTS idx_competition_views_user_comp ON competition_views(user_id, comp_id);
CREATE INDEX IF NOT EXISTS idx_competition_views_viewed_at ON competition_views(viewed_at);
