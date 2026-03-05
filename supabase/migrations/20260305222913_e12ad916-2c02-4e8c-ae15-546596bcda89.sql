
-- ==========================================
-- Fix ALL RLS policies to be PERMISSIVE
-- ==========================================

-- check_ins
DROP POLICY IF EXISTS "Anyone can view active check-ins" ON check_ins;
DROP POLICY IF EXISTS "Users can insert own check-ins" ON check_ins;
DROP POLICY IF EXISTS "Users can update own check-ins" ON check_ins;
DROP POLICY IF EXISTS "Admins can update any check-in" ON check_ins;

CREATE POLICY "Anyone can view check-ins" ON check_ins FOR SELECT USING (true);
CREATE POLICY "Users insert own check-ins" ON check_ins FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own check-ins" ON check_ins FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins update any check-in" ON check_ins FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- friendships
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can insert friendship requests" ON friendships;
DROP POLICY IF EXISTS "Users can update friendships they're part of" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;

CREATE POLICY "View own friendships" ON friendships FOR SELECT TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Insert friendship requests" ON friendships FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Update own friendships" ON friendships FOR UPDATE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Delete own friendships" ON friendships FOR DELETE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- locations
DROP POLICY IF EXISTS "Anyone can view locations" ON locations;
DROP POLICY IF EXISTS "Admins can insert locations" ON locations;
DROP POLICY IF EXISTS "Admins can update locations" ON locations;
DROP POLICY IF EXISTS "Admins can delete locations" ON locations;

CREATE POLICY "View locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Admin insert locations" ON locations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update locations" ON locations FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete locations" ON locations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- lore_drops
DROP POLICY IF EXISTS "Anyone can view active lore drops" ON lore_drops;
DROP POLICY IF EXISTS "Admins can insert lore drops" ON lore_drops;
DROP POLICY IF EXISTS "Admins can update lore drops" ON lore_drops;
DROP POLICY IF EXISTS "Admins can delete lore drops" ON lore_drops;

CREATE POLICY "View active lore drops" ON lore_drops FOR SELECT USING (is_active = true);
CREATE POLICY "Admin insert lore drops" ON lore_drops FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update lore drops" ON lore_drops FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete lore drops" ON lore_drops FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "View profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own profile" ON profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin update any profile" ON profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- study_sessions
DROP POLICY IF EXISTS "Anyone can view study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can insert own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can update own study sessions" ON study_sessions;

CREATE POLICY "View study sessions" ON study_sessions FOR SELECT USING (true);
CREATE POLICY "Insert own study sessions" ON study_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own study sessions" ON study_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

CREATE POLICY "View own roles" ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin view all roles" ON user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==========================================
-- Add study_coins to profiles
-- ==========================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_coins integer NOT NULL DEFAULT 0;

-- ==========================================
-- Shop system
-- ==========================================
DO $$ BEGIN
  CREATE TYPE shop_item_type AS ENUM ('badge', 'theme', 'map_icon');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type shop_item_type NOT NULL,
  cost integer NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View shop items" ON shop_items FOR SELECT USING (true);
CREATE POLICY "Admin insert shop items" ON shop_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update shop items" ON shop_items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete shop items" ON shop_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS user_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid REFERENCES shop_items(id) ON DELETE CASCADE NOT NULL,
  equipped boolean DEFAULT false,
  purchased_at timestamptz DEFAULT now()
);

ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own purchases" ON user_purchases FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own purchases" ON user_purchases FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own purchases" ON user_purchases FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Seed shop items
INSERT INTO shop_items (name, description, type, cost, metadata) VALUES
  ('🔥 Fire Badge', 'Show everyone you''re on fire', 'badge', 5, '{"emoji": "🔥"}'),
  ('⭐ Star Badge', 'You''re a star student', 'badge', 3, '{"emoji": "⭐"}'),
  ('🎓 Scholar Badge', 'Academic excellence', 'badge', 10, '{"emoji": "🎓"}'),
  ('🦉 Night Owl Badge', 'Late night grinder', 'badge', 8, '{"emoji": "🦉"}'),
  ('🌙 Dark Mode', 'Switch to dark theme', 'theme', 15, '{"theme": "dark"}'),
  ('🌅 Sunset Mode', 'Warm sunset colors', 'theme', 20, '{"theme": "sunset"}'),
  ('✨ Sparkle Icon', 'Sparkle effect on your map marker', 'map_icon', 12, '{"effect": "sparkle"}'),
  ('🎆 Fireworks Icon', 'Fireworks shooting from your marker', 'map_icon', 25, '{"effect": "fireworks"}');
