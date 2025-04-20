
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Constants for API Keys
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to search the web using SERPER
async function searchWeb(query: string) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY || '',
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

    return await response.json();
  } catch (error) {
    console.error('Error searching web:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for API keys
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'OpenAI API key not configured',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Get request body
    const { message, conversationId } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({
          error: 'No message provided',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Determine if we need to search for information
    let searchResults = null;
    let needsSearch = message.toLowerCase().includes('search') || 
                     message.toLowerCase().includes('look up') || 
                     message.toLowerCase().includes('find information');

    if (needsSearch && SERPER_API_KEY) {
      const searchQuery = message.replace(/search|look up|find information about/gi, '').trim();
      searchResults = await searchWeb(searchQuery);
    }

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: `You are Guardian AI, a helpful and protective assistant focused on personal safety. 
                 You provide information and guidance to help users stay safe in various situations.
                 You are friendly, concerned, and reassuring in your tone.
                 ${searchResults ? 'You have access to recent search results which you can use to provide accurate information.' : ''}`,
      },
    ];

    // Add search results to the system message if available
    if (searchResults) {
      messages.push({
        role: 'system',
        content: `Search results: ${JSON.stringify(searchResults)}`,
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Send request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Return the response
    return new Response(
      JSON.stringify({
        message: {
          content: aiMessage,
          isSearchResult: !!searchResults,
          searchData: searchResults,
        },
        conversationId: conversationId || Date.now().toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in AI Chat function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process your request',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
