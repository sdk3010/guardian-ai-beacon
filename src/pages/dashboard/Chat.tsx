
import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Send, User, Bot, VolumeX, Volume2 } from "lucide-react";
import { ai } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { voiceRecognition, voiceSynthesis } from '@/lib/voice';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isSearchResult?: boolean;
  searchData?: any;
}

export default function Chat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add welcome message when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          content: "Hello! I'm your Guardian AI assistant. How can I help you today?",
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() && !isListening) return;
    
    // Use the inputText if available, otherwise use the transcript from voice recognition
    const messageText = inputText.trim();
    setInputText('');
    
    // Add user message to state
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Call the AI service
      const response = await ai.chat(messageText, conversationId);
      const { message, conversationId: newConversationId } = response.data;
      
      // Save the conversation ID for future messages
      if (newConversationId) {
        setConversationId(newConversationId);
      }
      
      // Add AI response to state
      const botMessage: Message = {
        id: Date.now().toString() + '-bot',
        content: message.content,
        sender: 'bot',
        timestamp: new Date(),
        isSearchResult: message.isSearchResult,
        searchData: message.searchData,
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Speak the response if speech is enabled
      if (isSpeechEnabled) {
        setIsSpeaking(true);
        await voiceSynthesis.speak(message.content, true);
        setIsSpeaking(false);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
      
      // Add error message
      setMessages(prev => [
        ...prev, 
        {
          id: Date.now().toString() + '-error',
          content: "I'm sorry, I couldn't process your request. Please try again.",
          sender: 'bot',
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      voiceRecognition.stop();
      setIsListening(false);
    } else {
      voiceRecognition.start(
        (text) => {
          setInputText(text);
        }
      );
      setIsListening(true);
      toast({
        title: "Listening",
        description: "Say something or type your message",
      });
    }
  };

  const toggleSpeech = () => {
    setIsSpeechEnabled(!isSpeechEnabled);
    toast({
      title: isSpeechEnabled ? "Voice disabled" : "Voice enabled",
      description: isSpeechEnabled 
        ? "AI responses will not be spoken aloud" 
        : "AI responses will be spoken aloud",
    });
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Card className="h-[calc(100vh-8rem)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Bot className="mr-2 h-5 w-5 text-primary" />
              Chat Assistant
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleSpeech}
              >
                {isSpeechEnabled ? (
                  <Volume2 className={`h-4 w-4 ${isSpeaking ? 'text-primary animate-pulse' : ''}`} />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleListening}
                className={isListening ? 'bg-primary/10' : ''}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Avatar className={`h-8 w-8 ${message.sender === 'user' ? 'ml-2' : 'mr-2'}`}>
                    {message.sender === 'user' ? (
                      <>
                        <AvatarImage src={localStorage.getItem('userProfilePic') || undefined} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage src="/guardian-ai-logo.png" />
                        <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div>
                    <div 
                      className={`rounded-lg p-3 ${
                        message.sender === 'user' 
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.isSearchResult && (
                        <Badge variant="outline" className="mb-2">Search Result</Badge>
                      )}
                      {message.content}
                    </div>
                    <div 
                      className={`text-xs text-muted-foreground mt-1 ${
                        message.sender === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src="/guardian-ai-logo.png" />
                    <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg bg-muted p-3 flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="border-t pt-4">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }} 
              className="flex items-center space-x-2"
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleListening}
                className={isListening ? 'bg-primary/10' : ''}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              
              <Input
                placeholder={isListening ? "Listening..." : "Type a message..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || (!inputText.trim() && !isListening)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
