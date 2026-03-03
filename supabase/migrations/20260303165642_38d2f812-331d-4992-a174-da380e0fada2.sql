
-- Add 'party' to vibe_type enum
ALTER TYPE public.vibe_type ADD VALUE IF NOT EXISTS 'party';

-- Create lore drop category enum
CREATE TYPE public.lore_category AS ENUM ('general', 'special_offer', 'party_announced', 'serious', 'call_to_action');

-- Add category to lore_drops
ALTER TABLE public.lore_drops ADD COLUMN category public.lore_category NOT NULL DEFAULT 'general';

-- Create study_sessions table for pomodoro tracking
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own study sessions" ON public.study_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own study sessions" ON public.study_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can view own study sessions" ON public.study_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anyone can view study session stats" ON public.study_sessions
  FOR SELECT TO authenticated USING (true);

-- Add banned_until to profiles
ALTER TABLE public.profiles ADD COLUMN banned_until TIMESTAMP WITH TIME ZONE;

-- Allow admins to manage locations
CREATE POLICY "Admins can insert locations" ON public.locations
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update locations" ON public.locations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete locations" ON public.locations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
