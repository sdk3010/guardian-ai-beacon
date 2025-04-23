
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, AlertTriangle, Volume2 } from 'lucide-react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  // Check microphone permission
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        // Check if navigator.permissions is available
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissionState(permission.state);
          
          // Listen for permission changes
          permission.onchange = () => {
            setPermissionState(permission.state);
            if (permission.state === 'granted' && !isListening) {
              toast({
                title: "Microphone Access Granted",
                description: "You can now use voice commands",
              });
            } else if (permission.state !== 'granted' && isListening) {
              stopListening();
              toast({
                variant: "destructive",
                title: "Microphone Access Lost",
                description: "Voice recognition has been stopped",
              });
            }
          };
        } else {
          // Fallback to getUserMedia to check permissions
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setPermissionState('granted');
        }
      } catch (error) {
        console.error("Error checking microphone permission:", error);
        setPermissionState('denied');
      }
    };

    checkMicrophonePermission();
  }, []);

  // Voice recognition setup
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = async () => {
    // First check if permission is granted
    if (permissionState === 'denied') {
      toast({
        variant: "destructive",
        title: "Microphone Access Required",
        description: "Please enable microphone access in your browser settings",
      });
      return;
    }
    
    try {
      if (permissionState !== 'granted') {
        // Try to request microphone access explicitly
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionState('granted');
      }
      
      setIsListening(true);
      setTranscript("I'm listening...");
      setErrorMessage(null);
      
      voiceRecognition.start(
        (text) => {
          setTranscript(text);
          console.log("Voice recognition transcript:", text);
        },
        (triggerPhrase) => {
          // Handle emergency trigger phrases
          handleEmergencyTrigger(triggerPhrase);
        }
      );
      
      // Provide audio feedback
      voiceSynthesis.speak("I'm listening. How can I help you?", !isVoiceMuted);
      
      toast({
        title: "Voice Recognition Active",
        description: "Speak clearly into your microphone",
      });
    } catch (error) {
      console.error("Error starting voice recognition:", error);
      toast({
        variant: "destructive",
        title: "Microphone Error",
        description: "Could not access microphone. Please check your browser settings.",
      });
    }
  };

  const stopListening = () => {
    voiceRecognition.stop();
    setIsListening(false);
    setTranscript('Voice recognition stopped.');
    
    toast({
      title: "Voice Recognition Stopped",
      description: "You can still type your messages",
    });
  };

  const handleEmergencyTrigger = async (triggerPhrase: string) => {
    toast({
      variant: "destructive",
      title: "Emergency Detected",
      description: `Trigger phrase detected: "${triggerPhrase}"`,
    });
    
    // Speak a response to the user
    await voiceSynthesis.speak("I've detected an emergency situation. Sending an alert to your emergency contacts.", !isVoiceMuted);
    
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
    setErrorMessage(null);
    if (!isListening) {
      setTranscript("I'm listening...");
    }
    setIsProcessing(true);
    
    // Process the message
    if (onMessage) {
      onMessage(message);
      return; // Let parent component handle the rest
    }

    // Check for trigger phrases
    for (const phrase of TRIGGER_PHRASES) {
      if (message.toLowerCase().includes(phrase)) {
        handleEmergencyTrigger(phrase);
        setIsProcessing(false);
        return;
      }
    }

    try {
      console.log("Sending message to AI:", message);
      // Get AI response for voice interaction
      const response = await ai.chat(message);
      console.log("AI response:", response);
      
      if (!response || !response.data) {
        throw new Error('No response received from AI');
      }
      
      const aiResponse = response?.data?.message || "I'm sorry, I couldn't process your request.";
      
      // Temporarily stop listening while speaking to avoid feedback loop
      const wasListening = isListening;
      if (wasListening) {
        voiceRecognition.stop();
      }
      
      // Speak the response
      try {
        await voiceSynthesis.speak(aiResponse, !isVoiceMuted);
      } catch (speakError) {
        console.error("Error speaking response:", speakError);
        // Fallback to web speech if ElevenLabs fails
        await voiceSynthesis.speak(aiResponse, false);
      }
      
      // Resume listening if it was active before
      if (wasListening) {
        voiceRecognition.start(
          (text) => {
            setTranscript(text);
          },
          (triggerPhrase) => {
            handleEmergencyTrigger(triggerPhrase);
          }
        );
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      setErrorMessage("Could not get a response from the assistant. Please try again later.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not get a response from the assistant.",
      });
      
      // Speak error message
      await voiceSynthesis.speak("I'm sorry, I couldn't connect to my intelligence service. Please try again later.", false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const toggleVoiceMute = () => {
    setIsVoiceMuted(!isVoiceMuted);
    toast({
      title: isVoiceMuted ? "Voice Responses Enabled" : "Voice Responses Disabled",
      description: isVoiceMuted ? "The assistant will now speak responses" : "The assistant will not speak responses",
    });
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
        
        {permissionState === 'denied' && (
          <div className="bg-red-500/20 p-3 rounded-md flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-white">Microphone access denied. Please enable it in your browser settings.</p>
          </div>
        )}
        
        {errorMessage && (
          <div className="bg-red-500/20 p-3 rounded-md flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-white">{errorMessage}</p>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input 
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="bg-[#282c3a] border-[#9b87f5]/30 text-white"
            disabled={isProcessing}
          />
          <Button 
            onClick={handleSendMessage} 
            variant="outline"
            disabled={isProcessing}
            className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#9b87f5] hover:text-white"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button 
            onClick={toggleListening} 
            variant={isListening ? "destructive" : "outline"}
            className={isListening ? "" : "border-[#9b87f5] text-[#9b87f5] hover:bg-[#9b87f5] hover:text-white"}
            disabled={isProcessing || permissionState === 'denied'}
            aria-label={isListening ? "Stop listening" : "Start listening"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            onClick={toggleVoiceMute}
            variant="outline"
            className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#9b87f5] hover:text-white"
            aria-label={isVoiceMuted ? "Enable voice" : "Disable voice"}
          >
            <Volume2 className={`h-4 w-4 ${isVoiceMuted ? "opacity-50" : ""}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
