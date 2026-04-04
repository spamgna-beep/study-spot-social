ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles (last_seen_at);

CREATE INDEX IF NOT EXISTS idx_check_ins_active_user
  ON public.check_ins (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_check_ins_active_location
  ON public.check_ins (location_id, is_active);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created
  ON public.study_sessions (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.weekly_leaderboard_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  user_id uuid NOT NULL,
  rank integer NOT NULL,
  coins_awarded integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT weekly_leaderboard_rewards_week_user_key UNIQUE (week_start, user_id),
  CONSTRAINT weekly_leaderboard_rewards_week_rank_key UNIQUE (week_start, rank)
);

ALTER TABLE public.weekly_leaderboard_rewards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'weekly_leaderboard_rewards'
      AND policyname = 'Users can view their own weekly rewards'
  ) THEN
    CREATE POLICY "Users can view their own weekly rewards"
      ON public.weekly_leaderboard_rewards
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'weekly_leaderboard_rewards'
      AND policyname = 'Admins can view all weekly rewards'
  ) THEN
    CREATE POLICY "Admins can view all weekly rewards"
      ON public.weekly_leaderboard_rewards
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;