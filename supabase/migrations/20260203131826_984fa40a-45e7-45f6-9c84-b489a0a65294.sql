-- Add policy to allow users to view their own profile (for onboarding/pre-organization scenarios)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());