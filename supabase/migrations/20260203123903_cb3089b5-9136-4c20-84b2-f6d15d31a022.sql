-- Create whatsapp_accounts table
CREATE TABLE public.whatsapp_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  phone_number TEXT,
  display_name TEXT,
  profile_picture_url TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  connection_token TEXT,
  connection_token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_account_assignments table
CREATE TABLE public.user_account_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE (user_id, whatsapp_account_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_assignments ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for whatsapp_accounts
CREATE TRIGGER update_whatsapp_accounts_updated_at
  BEFORE UPDATE ON public.whatsapp_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for whatsapp_accounts
-- Users can view accounts in their organization
CREATE POLICY "Users can view accounts in their organization"
  ON public.whatsapp_accounts
  FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

-- Admins can create accounts in their organization
CREATE POLICY "Admins can create accounts in their organization"
  ON public.whatsapp_accounts
  FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );

-- Admins can update accounts in their organization
CREATE POLICY "Admins can update accounts in their organization"
  ON public.whatsapp_accounts
  FOR UPDATE
  USING (
    organization_id = get_user_organization_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );

-- Admins can delete accounts in their organization
CREATE POLICY "Admins can delete accounts in their organization"
  ON public.whatsapp_accounts
  FOR DELETE
  USING (
    organization_id = get_user_organization_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );

-- RLS Policies for user_account_assignments
-- Users can view their own assignments or all if admin
CREATE POLICY "Users can view their assignments or all if admin"
  ON public.user_account_assignments
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin')
  );

-- Admins can create assignments in their organization
CREATE POLICY "Admins can create assignments"
  ON public.user_account_assignments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can update assignments
CREATE POLICY "Admins can update assignments"
  ON public.user_account_assignments
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Admins can delete assignments
CREATE POLICY "Admins can delete assignments"
  ON public.user_account_assignments
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));