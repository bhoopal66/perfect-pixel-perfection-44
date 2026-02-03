-- Create a secure function to search for existing users by email
-- This function allows admins to find users who aren't part of any organization yet
CREATE OR REPLACE FUNCTION public.search_available_users(search_email text)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to search
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can search for users';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    p.avatar_url
  FROM public.profiles p
  WHERE 
    -- User is not in any organization yet
    p.organization_id IS NULL
    -- Match email (case insensitive partial match)
    AND p.email ILIKE '%' || search_email || '%'
    -- User is active
    AND p.is_active = true
  LIMIT 10;
END;
$$;

-- Create a secure function to add an existing user to the admin's organization
CREATE OR REPLACE FUNCTION public.add_user_to_organization(
  target_user_id uuid,
  assigned_role app_role DEFAULT 'agent'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_org_id uuid;
BEGIN
  -- Only allow admins to add users
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can add users to the organization';
  END IF;
  
  -- Get the admin's organization
  admin_org_id := public.get_user_organization_id(auth.uid());
  
  IF admin_org_id IS NULL THEN
    RAISE EXCEPTION 'Admin is not part of an organization';
  END IF;
  
  -- Check if target user exists and has no organization
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = target_user_id 
    AND organization_id IS NULL
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User not found or already in an organization';
  END IF;
  
  -- Update the user's profile to join the organization
  UPDATE public.profiles
  SET organization_id = admin_org_id,
      updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Delete any existing roles for this user (in case they had one before)
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Assign the new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, assigned_role);
  
  RETURN true;
END;
$$;