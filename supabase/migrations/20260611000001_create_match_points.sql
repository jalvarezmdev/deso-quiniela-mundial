-- supabase/migrations/20260611000001_create_match_points.sql
CREATE TABLE match_points (
  user_id     uuid REFERENCES profiles(id) NOT NULL,
  match_id    text REFERENCES matches(id) NOT NULL,
  phase       text NOT NULL,
  points      integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, match_id)
);

CREATE INDEX idx_match_points_phase ON match_points(phase);
CREATE INDEX idx_match_points_user ON match_points(user_id);

-- RLS: users can read their own, service role manages writes
ALTER TABLE match_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own match_points"
  ON match_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read match_points for leaderboard"
  ON match_points FOR SELECT
  USING (true);
