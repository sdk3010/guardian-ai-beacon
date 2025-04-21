import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, LoaderCircle, Mic, MicOff, Bot, Send, User } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { voiceRecognition, voiceSynthesis } from '@/lib/voice';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  error?: boolean;
  searchData?: any;
}

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasChatError, setHasChatError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const welcomeMessage = {
      id: 'welcome',
      content: `Hey${user ? ', ' + user.user_metadata?.name : ''}! I'm your Guardian AI assistant. How can I help you today?`,
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const historyMessages = data.map(msg => ({
          id: msg.id,
          content: msg.message,
          isUser: msg.is_user,
          timestamp: new Date(msg.created_at)
        }));
        
        setMessages(historyMessages);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const saveChatMessage = async (message: string, isUser: boolean) => {
    if (!user) return;
    
    try {
      await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          message: message,
          is_user: isUser
        });
    } catch (err) {
      console.error('Failed to save chat message:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    await saveChatMessage(inputMessage, true);
    
    setInputMessage('');
    
    inputRef.current?.focus();
    
    const loadingId = Date.now() + 1000;
    const loadingMessage: Message = {
      id: loadingId.toString(),
      content: '',
      isUser: false,
      timestamp: new Date(),
      isLoading: true
    };
    
    setMessages(prev => [...prev, loadingMessage]);
    setIsLoading(true);
    setHasChatError(false);
    
    try {
      const response = await fetch("https://loouyfusnadcgfltcxyt.functions.supabase.co/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: inputMessage,
          conversationId
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingId.toString()
            ? {
                id: loadingId.toString(),
                content: data.message.content,
                isUser: false,
                timestamp: new Date(),
                searchData: data.message.searchData
              }
            : msg
        )
      );
      
      await saveChatMessage(data.message.content, false);
      
      voiceSynthesis.speak(data.message.content);
      
    } catch (error: any) {
      console.error('Chat error:', error);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingId.toString()
            ? {
                id: loadingId.toString(),
                content: "I'm sorry, I couldn't process your request. Please try again.",
                isUser: false,
                timestamp: new Date(),
                error: true
              }
            : msg
        )
      );
      
      toast({
        variant: "destructive",
        title: "Chat Error",
        description: error.message || "Failed to get a response",
      });
      
      setHasChatError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      voiceRecognition.stop();
      setIsListening(false);
    } else {
      voiceRecognition.start((text) => {
        setInputMessage(text);
      });
      setIsListening(true);
      toast({
        title: "Voice Input Active",
        description: "Speak clearly into your microphone",
      });
    }
  };

  if (hasChatError && messages.length <= 2) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-semibold">Chat Assistant Unavailable</h2>
              <p className="text-muted-foreground max-w-md">
                We're having trouble connecting to our AI assistant. This could be due to network issues or service unavailability.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">
              You need to be logged in to use the chat assistant.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Chat Error</AlertTitle>
          <AlertDescription>
            Something went wrong with the chat assistant. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    }>
      <div className="p-4 md:p-6 max-w-4xl mx-auto h-[calc(100vh-64px)] flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center">
              <Bot className="mr-2 h-5 w-5 text-primary" />
              Guardian AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-3 max-w-[80%] ${message.isUser ? 'flex-row-reverse' : ''}`}>
                      <Avatar className={message.isUser ? 'bg-primary' : 'bg-secondary'}>
                        {message.isUser ? (
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        ) : (
                          <AvatarFallback>
                            <Bot className="h-5 w-5" />
                          </AvatarFallback>
                        )}
                        <AvatarImage src={message.isUser ? user?.user_metadata?.avatar_url : undefined} />
                      </Avatar>
                      <div 
                        className={`
                          rounded-lg p-3 
                          ${message.isUser 
                            ? 'bg-primary text-primary-foreground' 
                            : message.error 
                              ? 'bg-destructive/10 border border-destructive/20' 
                              : 'bg-accent'
                          }
                        `}
                      >
                        {message.isLoading ? (
                          <div className="flex items-center space-x-2">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        ) : (
                          <>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            
                            {message.searchData && (
                              <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                                <p className="font-medium">Based on search results</p>
                              </div>
                            )}
                            
                            <div className="mt-1 text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={toggleVoiceInput}
                  className={isListening ? 'bg-primary/10' : ''}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!inputMessage.trim() || isLoading}
                >
                  {isLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
