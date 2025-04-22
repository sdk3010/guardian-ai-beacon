
-- Create a policy to allow public select
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'profiles');

-- Add a policy to allow authenticated users to upload objects
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- Add a policy to allow authenticated users to update their own objects
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- Add a policy to allow authenticated users to delete their own objects
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = auth.uid()
);

-- Make sure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;
