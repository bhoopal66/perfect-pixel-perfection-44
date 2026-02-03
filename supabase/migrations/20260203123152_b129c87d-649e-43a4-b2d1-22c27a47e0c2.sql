-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Function to get user's organization_id (security definer)
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (id = public.get_user_organization_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create an organization during signup"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their organization"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT p.user_id FROM public.profiles p 
      WHERE p.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Admins can manage roles in their organization"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT p.user_id FROM public.profiles p 
      WHERE p.organization_id = public.get_user_organization_id(auth.uid())
    ) AND public.has_role(auth.uid(), 'admin')
  );

-- Allow inserting own role during signup
CREATE POLICY "Users can insert their own role during signup"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();