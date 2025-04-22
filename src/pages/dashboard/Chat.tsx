
import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ai } from '@/lib/api';

interface ChatMessage {
  id?: string;
  message: string;
  is_user: boolean;
  created_at?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchChatHistory = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data);
    }
  }, [user]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const userMessage: ChatMessage = {
      message: newMessage,
      is_user: true
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const response = await ai.chat(newMessage);
      
      const aiMessage: ChatMessage = {
        message: response.data.message,
        is_user: false
      };

      // Save messages to Supabase
      await Promise.all([
        supabase.from('chat_history').insert({
          user_id: user.id,
          message: newMessage,
          is_user: true
        }),
        supabase.from('chat_history').insert({
          user_id: user.id,
          message: aiMessage.message,
          is_user: false
        })
      ]);

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-grow overflow-y-auto mb-4 space-y-2">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`p-2 rounded-lg max-w-[80%] 
              ${msg.is_user ? 'bg-blue-100 self-end ml-auto' : 'bg-gray-100 self-start mr-auto'}`}
          >
            {msg.message}
          </div>
        ))}
        {isLoading && (
          <div className="p-2 bg-gray-100 rounded-lg">
            Generating response...
          </div>
        )}
      </div>
      
      <div className="flex space-x-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button onClick={handleSendMessage} disabled={isLoading}>
          Send
        </Button>
      </div>
    </div>
  );
}
