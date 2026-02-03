-- Create team invitations table
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(organization_id, email, status)
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for invitations
CREATE POLICY "Admins can view invitations in their organization"
ON public.team_invitations FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create invitations"
ON public.team_invitations FOR INSERT
WITH CHECK (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitations"
ON public.team_invitations FOR UPDATE
USING (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitations"
ON public.team_invitations FOR DELETE
USING (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- Allow users to view their own pending invitation by token (for accepting)
CREATE POLICY "Users can view their invitation by token"
ON public.team_invitations FOR SELECT
USING (status = 'pending' AND expires_at > now());

-- Index for faster lookups
CREATE INDEX idx_team_invitations_org ON public.team_invitations(organization_id);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);