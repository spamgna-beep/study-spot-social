
-- Add university column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university text DEFAULT NULL;

-- Add university column to locations
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS university text DEFAULT NULL;
