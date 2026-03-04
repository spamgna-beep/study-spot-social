
-- Fix RLS: Drop all RESTRICTIVE SELECT policies and recreate as PERMISSIVE

-- check_ins: fix SELECT policies
DROP POLICY IF EXISTS "Admins can view all check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Users can view friends active check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Admins can update any check-in" ON public.check_ins;
DROP POLICY IF EXISTS "Users can insert own check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Users can update own check-ins" ON public.check_ins;

CREATE POLICY "Anyone can view active check-ins" ON public.check_ins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own check-ins" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own check-ins" ON public.check_ins FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can update any check-in" ON public.check_ins FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles: fix SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view non-ghost profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- study_sessions: fix duplicate SELECT
DROP POLICY IF EXISTS "Anyone can view study session stats" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can view own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can insert own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can update own study sessions" ON public.study_sessions;

CREATE POLICY "Anyone can view study sessions" ON public.study_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own study sessions" ON public.study_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own study sessions" ON public.study_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- user_roles: fix SELECT 
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- locations: fix SELECT
DROP POLICY IF EXISTS "Anyone authenticated can view locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can update locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can delete locations" ON public.locations;

CREATE POLICY "Anyone can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert locations" ON public.locations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update locations" ON public.locations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete locations" ON public.locations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- lore_drops: fix SELECT
DROP POLICY IF EXISTS "Anyone can view active lore drops" ON public.lore_drops;
DROP POLICY IF EXISTS "Admins can insert lore drops" ON public.lore_drops;
DROP POLICY IF EXISTS "Admins can update lore drops" ON public.lore_drops;
DROP POLICY IF EXISTS "Admins can delete lore drops" ON public.lore_drops;

CREATE POLICY "Anyone can view active lore drops" ON public.lore_drops FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can insert lore drops" ON public.lore_drops FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update lore drops" ON public.lore_drops FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete lore drops" ON public.lore_drops FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- friendships: fix policies
DROP POLICY IF EXISTS "Users can view own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can insert friendship requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can update friendships they're part of" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON public.friendships;

CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Users can insert friendship requests" ON public.friendships FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Users can update friendships they're part of" ON public.friendships FOR UPDATE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
