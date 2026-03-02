
-- Add 'flow' to vibe_type enum
ALTER TYPE public.vibe_type ADD VALUE IF NOT EXISTS 'flow';

-- Create app_role enum and user_roles table for admin
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles: users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create notifications/lore_drops table
CREATE TABLE public.lore_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.lore_drops ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active lore drops
CREATE POLICY "Anyone can view active lore drops"
ON public.lore_drops
FOR SELECT
TO authenticated
USING (is_active = true);

-- Only admins can insert lore drops
CREATE POLICY "Admins can insert lore drops"
ON public.lore_drops
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update lore drops
CREATE POLICY "Admins can update lore drops"
ON public.lore_drops
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete lore drops
CREATE POLICY "Admins can delete lore drops"
ON public.lore_drops
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any profile (for moderation)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all profiles (including ghost)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all check_ins
CREATE POLICY "Admins can view all check-ins"
ON public.check_ins
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any check-in
CREATE POLICY "Admins can update any check-in"
ON public.check_ins
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for lore_drops
ALTER PUBLICATION supabase_realtime ADD TABLE public.lore_drops;
