
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { voiceRecognition, voiceSynthesis, TRIGGER_PHRASES } from '@/lib/voice';
import { ai } from '@/lib/api';

interface VoiceAssistantProps {
  onMessage?: (message: string) => void;
  onEmergency?: () => void;
  className?: string;
}

export default function VoiceAssistant({ onMessage, onEmergency, className }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('I\'m listening...');
  const [inputMessage, setInputMessage] = useState('');
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice recognition setup
  const toggleListening = () => {
    if (isListening) {
      voiceRecognition.stop();
      setIsListening(false);
      setTranscript('Voice recognition stopped.');
    } else {
      startListening();
    }
  };

  const startListening = () => {
    setIsListening(true);
    voiceRecognition.start(
      (text) => {
        setTranscript(text);
      },
      (triggerPhrase) => {
        // Handle emergency trigger phrases
        handleEmergencyTrigger(triggerPhrase);
      }
    );
  };

  const handleEmergencyTrigger = async (triggerPhrase: string) => {
    toast({
      variant: "destructive",
      title: "Emergency Detected",
      description: `Trigger phrase detected: "${triggerPhrase}"`,
    });
    
    // Speak a response to the user
    await voiceSynthesis.speak("I've detected an emergency situation. Sending an alert to your emergency contacts.");
    
    // Call the emergency handler if provided
    if (onEmergency) {
      onEmergency();
    }
  };

  const handleSendMessage = async () => {
    const message = inputMessage.trim() || transcript;
    if (!message || message === "I'm listening...") return;

    // Reset states
    setInputMessage('');
    setTranscript("I'm listening...");
    
    // Process the message
    if (onMessage) {
      onMessage(message);
    }

    // Check for trigger phrases
    for (const phrase of TRIGGER_PHRASES) {
      if (message.toLowerCase().includes(phrase)) {
        handleEmergencyTrigger(phrase);
        return;
      }
    }

    try {
      // Get AI response for voice interaction
      const response = await ai.chat(message);
      const aiResponse = response.data.message;
      
      // Speak the response
      voiceSynthesis.speak(aiResponse);
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not get a response from the assistant.",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Clean up voice recognition on component unmount
  useEffect(() => {
    return () => {
      voiceRecognition.stop();
    };
  }, []);

  return (
    <Card className={`bg-[#1A1F2C] border-[#9b87f5]/30 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2">
          <Mic className="h-5 w-5 text-[#9b87f5]" />
          Voice Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-[#282c3a] rounded-md p-4 min-h-[100px] text-[#F1F0FB]">
          {transcript}
        </div>
        
        <div>
          <p className="text-[#F1F0FB] mb-2">Say or type:</p>
          <ul className="space-y-1 text-sm">
            <li className="text-[#9b87f5]">"Where am I?" - Get current location</li>
            <li className="text-[#9b87f5]">"Are there safe places nearby?" - List safe locations</li>
            <li className="text-[#9b87f5]">"Am I safe?" - Check safety status</li>
            <li className="text-red-400">Emergency trigger phrases will alert your contacts</li>
          </ul>
        </div>
        
        <div className="flex gap-2">
          <Input 
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="bg-[#282c3a] border-[#9b87f5]/30 text-white"
          />
          <Button 
            onClick={handleSendMessage} 
            variant="outline"
            className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#9b87f5] hover:text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button 
            onClick={toggleListening} 
            variant={isListening ? "destructive" : "outline"}
            className={isListening ? "" : "border-[#9b87f5] text-[#9b87f5] hover:bg-[#9b87f5] hover:text-white"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
