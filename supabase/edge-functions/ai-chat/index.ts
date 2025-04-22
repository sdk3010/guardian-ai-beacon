
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define agent types and roles
const AGENTS = {
  LISTENER: {
    type: 'listener',
    role: 'You are the Listener agent. Your role is to carefully analyze user messages to detect signs of distress, fear, or safety concerns. Look for keywords or patterns that might indicate the user needs help. Respond with {"detected": true/false, "level": 1-10, "keywords": ["word1", "word2"], "reasoning": "your analysis"}',
  },
  RESPONDER: {
    type: 'responder',
    role: 'You are the Responder agent for a personal safety app. Your role is to provide calm, helpful responses to user queries, especially those related to safety concerns. Always maintain a reassuring tone and offer practical advice. For safety concerns, suggest contacting emergency services if the situation is serious. Include specific actions the user can take. Respond in a conversational, empathetic manner.',
  },
  ACTION: {
    type: 'action',
    role: 'You are the Action agent. Your role is to recommend specific actions based on the user\'s situation. When a user expresses safety concerns, suggest concrete steps like "share your location", "contact emergency services", or "move to a well-lit area". Provide a JSON response with {"actions": ["action1", "action2"], "priority": "high/medium/low", "reasoning": "your reasoning"}',
  },
  MEMORY: {
    type: 'memory',
    role: 'You are the Memory agent. Your role is to consider the context of previous interactions when formulating a response. Remember important details the user has shared in the past and incorporate them in your response to provide continuity and personalization. Format your response naturally in a helpful manner.',
  }
};

const determineAgent = (message: string) => {
  // Check for emergency or distress indicators
  const emergencyKeywords = ['help', 'emergency', 'unsafe', 'scared', 'danger', 'following'];
  
  if (emergencyKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
    return 'action';
  }
  
  // Check for specific queries that memory would be useful for
  if (message.toLowerCase().includes('remember') || 
      message.toLowerCase().includes('earlier') || 
      message.toLowerCase().includes('before')) {
    return 'memory';
  }
  
  // Default to responder for most interactions
  return 'responder';
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }
    
    // First, run the Listener agent to detect if this is a safety concern
    const detectionResult = await callGeminiAPI(AGENTS.LISTENER.role, message);
    let detection;
    try {
      // Try to parse the detection result
      const detectionText = detectionResult.candidates[0].content.parts[0].text;
      detection = JSON.parse(detectionText);
    } catch (err) {
      console.error("Error parsing detection result:", err);
      detection = { detected: false, level: 0 };
    }
    
    // Determine which agent should handle the response
    const agentType = detection.detected && detection.level > 5 
      ? 'action' 
      : determineAgent(message);
    
    let agentRole;
    switch (agentType) {
      case 'action':
        agentRole = AGENTS.ACTION.role;
        break;
      case 'memory':
        agentRole = AGENTS.MEMORY.role;
        break;
      case 'listener':
        agentRole = AGENTS.LISTENER.role;
        break;
      default:
        agentRole = AGENTS.RESPONDER.role;
    }
    
    // Call the appropriate agent
    const result = await callGeminiAPI(agentRole, message);
    
    if (!result.candidates || result.candidates.length === 0) {
      throw new Error('Failed to get a response from the AI model');
    }
    
    let responseText = result.candidates[0].content.parts[0].text;
    
    // If it's an action agent response, try to parse any JSON and format it
    if (agentType === 'action') {
      try {
        const actionData = JSON.parse(responseText);
        responseText = `I recommend the following actions:\n\n${actionData.actions.join('\n')}\n\nPriority: ${actionData.priority}\n\n${actionData.reasoning || ''}`;
      } catch (err) {
        // If parsing fails, just use the original text
        console.log("Could not parse action JSON, using original text");
      }
    }

    return new Response(
      JSON.stringify({ 
        message: responseText,
        agent_type: agentType,
        detection: detection.detected ? detection : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function callGeminiAPI(systemPrompt: string, userMessage: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt + "\n\nUser message: " + userMessage }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error (${response.status}):`, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  return await response.json();
}
