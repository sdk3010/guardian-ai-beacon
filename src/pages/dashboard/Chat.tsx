
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from 'lucide-react';
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
      
      // Make API call for response
      const response = await fetch('https://guardianai-backend.sdk3010.repl.co/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ESu++FGew14skiJjdywXokWEnUza5aiDmb1zQRYFoui+7/ww9v/xIphU0FQ9nzie0nPGT/T58aQt091W0sjUDA=='
        },
        body: JSON.stringify({ message: userInput }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AI response data:', data);
      
      const aiMessage: ChatMessage = {
        message: data.message || "I'm having trouble understanding. Could you rephrase that?",
        is_user: false,
        agent_type: data.agent_type || 'responder'
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
      if (aiMessage.message) {
        voiceSynthesis.speak(aiMessage.message, true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get a response from the AI assistant.",
      });
    } finally {
      setIsLoading(false);
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
