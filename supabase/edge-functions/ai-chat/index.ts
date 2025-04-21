
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

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
    const { message, conversationId, userId } = await req.json();

    if (!message) {
      throw new Error('No message provided');
    }

    // Call OpenAI for chat completion
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Guardian AI, a personal safety assistant. Your primary focus is on keeping the user safe, 
                      providing guidance, and responding to safety concerns. Use a supportive and calm tone.
                      If the user appears to be in distress, acknowledge it and offer appropriate advice.`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      throw new Error(`API error from OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Simple distress detection 
    const distressKeywords = ['help', 'emergency', 'scared', 'afraid', 'danger', 'hurt', 'injured', 'attack'];
    const lowercaseMessage = message.toLowerCase();
    
    // Basic distress detection
    const distressDetected = distressKeywords.some(keyword => lowercaseMessage.includes(keyword));
    const distressLevel = distressDetected ? 0.7 : 0;

    return new Response(
      JSON.stringify({
        message: {
          content: aiMessage,
          distressDetected,
          distressLevel,
        },
        conversationId: conversationId || crypto.randomUUID(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in AI chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
