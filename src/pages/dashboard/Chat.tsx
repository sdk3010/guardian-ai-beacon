
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send, AlertTriangle, Mic, MicOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ai } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import VoiceAssistant from '@/components/voice/VoiceAssistant';
import { voiceSynthesis } from '@/lib/voice';

interface ChatMessage {
  id?: string;
  message: string;
  is_user: boolean;
  created_at?: string;
  agent_type?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const fetchChatHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        setMessages(data.map(item => ({
          id: item.id,
          message: item.message,
          is_user: item.is_user,
          created_at: item.created_at,
          agent_type: item.is_user ? undefined : 'responder'
        })));
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load chat history.",
      });
    }
  }, [user, toast]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (userInput: string = newMessage) => {
    if (!userInput.trim() || !user) return;
    setError(null);
    
    const userMessage: ChatMessage = {
      message: userInput,
      is_user: true
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      console.log('Sending message to AI:', userInput);
      
      // Save user message to Supabase
      const { error: userMsgError } = await supabase.from('chat_history').insert({
        user_id: user.id,
        message: userInput,
        is_user: true
      });
      
      if (userMsgError) {
        console.error('Error saving user message:', userMsgError);
      }
      
      // Use the Indian Cities API for city information if the query is related
      if (userInput.toLowerCase().includes('city') || 
          userInput.toLowerCase().includes('cities') || 
          userInput.toLowerCase().includes('urban') || 
          userInput.toLowerCase().includes('telangana') || 
          userInput.toLowerCase().includes('hyderabad')) {
        
        try {
          // Get Indian cities data
          const response = await fetch('https://indian-cities-api-nocbegfhqg.now.sh/cities');
          const citiesData = await response.json();
          
          // Filter or get relevant city data
          const telanganaFilter = citiesData.filter(city => city.state === 'Telangana');
          const hyderabadData = citiesData.find(city => city.name === 'Hyderabad');
          
          // Create an AI response with the cities data
          let aiResponse = "";
          
          if (userInput.toLowerCase().includes('hyderabad')) {
            aiResponse = `Hyderabad is a major city in Telangana, India. It's known for its rich history, monuments like Charminar, and as a technology hub with areas like HITEC City.`;
          } else if (userInput.toLowerCase().includes('telangana')) {
            aiResponse = `Telangana is a state in southern India with Hyderabad as its capital. There are ${telanganaFilter.length} major urban centers in Telangana. Some key cities include Hyderabad, Warangal, Nizamabad, and Karimnagar.`;
          } else {
            aiResponse = `India has many major cities across its states. Some key metropolitan areas include Mumbai, Delhi, Bangalore, Hyderabad, and Chennai. Each city has its unique culture, industries, and heritage.`;
          }
          
          const aiMessage: ChatMessage = {
            message: aiResponse,
            is_user: false,
            agent_type: 'city_information'
          };
          
          // Save AI message to Supabase
          const { error: aiMsgError } = await supabase.from('chat_history').insert({
            user_id: user.id,
            message: aiMessage.message,
            is_user: false
          });
          
          if (aiMsgError) {
            console.error('Error saving AI message:', aiMsgError);
          }
          
          setMessages(prev => [...prev, aiMessage]);
          
          // Speak the response with voice synthesis
          if (aiMessage.message && !isMuted) {
            voiceSynthesis.speak(aiMessage.message);
          }
          
          setIsLoading(false);
          return;
        } catch (cityApiError) {
          console.error('Error fetching Indian cities data:', cityApiError);
          // If the special handling fails, continue with the regular AI response
        }
      }
      
      // If we didn't return early with special handling, use fallback API response
      const mockAIResponse = {
        message: generateMockResponse(userInput),
        agent_type: 'assistant'
      };
      
      // Save AI message to Supabase
      const { error: aiMsgError } = await supabase.from('chat_history').insert({
        user_id: user.id,
        message: mockAIResponse.message,
        is_user: false
      });
      
      if (aiMsgError) {
        console.error('Error saving AI message:', aiMsgError);
      }
      
      const aiMessage: ChatMessage = {
        message: mockAIResponse.message,
        is_user: false,
        agent_type: mockAIResponse.agent_type
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Speak the response with voice synthesis
      if (aiMessage.message && !isMuted) {
        voiceSynthesis.speak(aiMessage.message);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to get a response from the AI assistant. Please try again later.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get a response from the AI assistant.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate mock responses when the AI API is unavailable
  const generateMockResponse = (userInput: string): string => {
    const userInputLower = userInput.toLowerCase();
    
    if (userInputLower.includes('hello') || userInputLower.includes('hi')) {
      return "Hello! I'm Guardian AI, your safety assistant. How can I help you today?";
    } 
    else if (userInputLower.includes('help') || userInputLower.includes('emergency')) {
      return "If you're in an emergency situation, tap the 'Emergency' button and I'll alert your emergency contacts with your current location. You can also use voice commands by saying 'Help me'.";
    }
    else if (userInputLower.includes('location') || userInputLower.includes('where')) {
      return "I can track your location in real-time. Go to the Tracking page to start a tracking session. Your emergency contacts can see your location if you trigger an alert.";
    }
    else if (userInputLower.includes('safe') || userInputLower.includes('danger')) {
      return "Your safety is my priority. I can help you find nearby safe places, track your location, and contact emergency services if needed. Use the voice commands to quickly request assistance.";
    }
    else if (userInputLower.includes('contact') || userInputLower.includes('call')) {
      return "You can add emergency contacts in the Contacts page. These contacts will be notified automatically in case you trigger an emergency alert.";
    }
    else {
      return "I'm here to help keep you safe. You can ask me about safety features, location tracking, emergency contacts, or how to use the app. What would you like to know?";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleVoiceMessage = (message: string) => {
    handleSendMessage(message);
  };

  const handleEmergency = () => {
    toast({
      variant: "destructive",
      title: "Emergency Alert",
      description: "Emergency services and contacts are being notified of your situation.",
    });
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Voice Unmuted" : "Voice Muted",
      description: isMuted ? "Voice responses are now enabled" : "Voice responses are now disabled",
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 p-4 bg-[#1A1F2C]">
      <div className="flex flex-col flex-grow md:w-2/3 h-full">
        <div className="flex-grow overflow-y-auto mb-4 rounded-lg bg-[#232836] p-4 border border-[#9b87f5]/20">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-[#F1F0FB] opacity-70 py-8">
                <p>Send a message to start a conversation with Guardian AI</p>
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg max-w-[85%] ${
                  msg.is_user 
                    ? 'bg-[#9b87f5]/10 border border-[#9b87f5]/30 text-white self-end ml-auto' 
                    : 'bg-[#282c3a] border border-gray-700 text-[#F1F0FB] self-start mr-auto'
                }`}
              >
                {!msg.is_user && msg.agent_type && (
                  <div className="text-xs text-[#9b87f5] mb-1 font-semibold">
                    {msg.agent_type.charAt(0).toUpperCase() + msg.agent_type.slice(1)} Agent
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.message}</div>
              </div>
            ))}
            
            {isLoading && (
              <div className="p-3 bg-[#282c3a] border border-gray-700 rounded-lg text-[#F1F0FB] self-start mr-auto max-w-[85%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#9b87f5]" />
                  <span>AI is thinking...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-white self-start mr-auto max-w-[85%]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="bg-[#282c3a] border-[#9b87f5]/30 text-white"
          />
          <Button 
            onClick={() => handleSendMessage()} 
            disabled={isLoading}
            className="bg-[#9b87f5] hover:bg-[#8a76e4] text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className="border-[#9b87f5] text-[#9b87f5]"
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      <div className="md:w-1/3 mt-4 md:mt-0">
        <VoiceAssistant 
          onMessage={handleVoiceMessage} 
          onEmergency={handleEmergency}
          className="h-full"
        />
      </div>
    </div>
  );
}
