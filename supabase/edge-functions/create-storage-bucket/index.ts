
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Check if the bucket already exists
    const { data: existingBuckets, error: bucketsError } = await supabaseClient.storage.listBuckets();
    
    if (bucketsError) {
      throw new Error(`Error listing buckets: ${bucketsError.message}`);
    }
    
    const profilesBucketExists = existingBuckets.some(bucket => bucket.name === 'profiles');
    
    if (!profilesBucketExists) {
      // Create the profiles bucket
      const { error: createError } = await supabaseClient.storage.createBucket('profiles', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
      });
      
      if (createError) {
        throw new Error(`Error creating bucket: ${createError.message}`);
      }
      
      // Set up RLS policy to allow all authenticated users to insert into the bucket
      const { error: policyError } = await supabaseClient.rpc('create_storage_policy', {
        bucket_name: 'profiles',
        policy_name: 'Allow authenticated uploads',
        definition: 'storage.object.bucket_id = \'profiles\''
      });
      
      if (policyError) {
        console.error('Error creating policy:', policyError);
        // Continue even if policy creation fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Profiles bucket created or verified' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
