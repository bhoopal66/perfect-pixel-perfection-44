
-- Create storage bucket for WhatsApp media
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('wa-media', 'wa-media', true, 20971520)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to wa-media bucket
CREATE POLICY "Authenticated users can upload wa-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wa-media');

-- Allow public read access to wa-media
CREATE POLICY "Public read access for wa-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wa-media');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete wa-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wa-media');
