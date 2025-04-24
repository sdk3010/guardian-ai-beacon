
-- Enable storage for profile pictures
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' AND 
  auth.uid()::text = (regexp_match(name, '^([^/]+)'))[1]
);

CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles' AND 
  auth.uid()::text = (regexp_match(name, '^([^/]+)'))[1]
);

CREATE POLICY "Profile pictures are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');

-- Add column for location prompt status if it doesn't exist
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS has_seen_location_prompt boolean DEFAULT false;
