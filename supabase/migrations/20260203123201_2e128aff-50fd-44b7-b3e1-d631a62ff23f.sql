-- Fix the handle_updated_at function to set search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop the overly permissive policy and create a proper one
DROP POLICY IF EXISTS "Anyone can create an organization during signup" ON public.organizations;

-- Allow users to create an organization only if they don't have one yet
CREATE POLICY "Users can create their first organization"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
  );