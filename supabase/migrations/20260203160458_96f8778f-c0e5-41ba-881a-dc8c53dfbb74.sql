-- Create storage bucket for WhatsApp profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-profile-pictures', 'whatsapp-profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their organization's folder
CREATE POLICY "Users can upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'whatsapp-profile-pictures' AND
  (storage.foldername(name))[1] = get_user_organization_id(auth.uid())::text
);

-- Allow authenticated users to update their organization's files
CREATE POLICY "Users can update profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'whatsapp-profile-pictures' AND
  (storage.foldername(name))[1] = get_user_organization_id(auth.uid())::text
);

-- Allow authenticated users to delete their organization's files
CREATE POLICY "Users can delete profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'whatsapp-profile-pictures' AND
  (storage.foldername(name))[1] = get_user_organization_id(auth.uid())::text
);

-- Allow public read access since bucket is public
CREATE POLICY "Public can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'whatsapp-profile-pictures');