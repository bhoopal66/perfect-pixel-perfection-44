-- Create team_activity_logs table
CREATE TABLE public.team_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  target_email TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins and managers can view activity logs
CREATE POLICY "Admins and managers can view activity logs"
ON public.team_activity_logs
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Users can insert activity logs for their organization
CREATE POLICY "Users can insert activity logs"
ON public.team_activity_logs
FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  AND performed_by = auth.uid()
);

-- Create index for faster queries
CREATE INDEX idx_team_activity_logs_org_created 
ON public.team_activity_logs(organization_id, created_at DESC);