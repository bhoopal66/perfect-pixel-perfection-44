-- Add UPDATE and DELETE policies for user_roles (admins only)
CREATE POLICY "Admins can update roles in their organization"
ON public.user_roles FOR UPDATE
USING (
  (user_id IN (SELECT p.user_id FROM profiles p WHERE p.organization_id = get_user_organization_id(auth.uid())))
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete roles in their organization"
ON public.user_roles FOR DELETE
USING (
  (user_id IN (SELECT p.user_id FROM profiles p WHERE p.organization_id = get_user_organization_id(auth.uid())))
  AND has_role(auth.uid(), 'admin')
);