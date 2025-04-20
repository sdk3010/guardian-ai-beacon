
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for API key
    if (!SERPER_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'SERPER API key not configured',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Get request body
    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({
          error: 'No search query provided',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Call SERPER API
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: 'us',
        hl: 'en',
      }),
    });

    if (!response.ok) {
      throw new Error(`SERPER API error: ${response.status}`);
    }

    const searchResults = await response.json();

    // Return the search results
    return new Response(
      JSON.stringify({
        results: searchResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in web-search function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to search the web',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
