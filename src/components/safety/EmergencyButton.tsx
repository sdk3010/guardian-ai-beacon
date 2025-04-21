
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { voiceSynthesis } from '@/lib/voice';

interface EmergencyButtonProps {
  className?: string;
}

export default function EmergencyButton({ className }: EmergencyButtonProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const triggerEmergency = async () => {
    if (isTriggering) return;
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to send emergency alerts",
        variant: "destructive",
      });
      return;
    }
    
    setIsTriggering(true);

    try {
      // Get current location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          try {
            // Try the backend API first
            try {
              const response = await fetch("https://guardianai-backend.sdk3010.repl.co/trigger-alert", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": "ESu++FGew14skiJjdywXokWEnUza5aiDmb1zQRYFoui+7/ww9v/xIphU0FQ9nzie0nPGT/T58aQt091W0sjUDA=="
                },
                body: JSON.stringify({
                  location,
                  message: "Emergency button pressed"
                })
              });
              
              if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
              }
            } catch (apiErr) {
              console.error('Backend API failed, using Supabase fallback:', apiErr);
              
              // Fallback to Supabase
              const { error } = await supabase
                .from('alerts')
                .insert({
                  user_id: user.id,
                  type: 'button',
                  latitude: location.lat,
                  longitude: location.lng,
                  message: "Emergency button pressed",
                  status: 'active'
                });
                
              if (error) throw error;
            }
            
            // Provide feedback
            voiceSynthesis.speak("Emergency alert sent to your contacts");
            
            toast({
              title: "Alert sent",
              description: "Emergency contacts have been notified of your location",
              variant: "destructive",
            });
          } catch (err: any) {
            console.error('Failed to send emergency alert:', err);
            toast({
              title: "Alert failed",
              description: "Could not send emergency alert. Please try again.",
              variant: "destructive",
            });
            voiceSynthesis.speak("Failed to send emergency alert");
          } finally {
            setIsTriggering(false);
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          toast({
            title: "Location error",
            description: "Could not get your location. Please enable location services.",
            variant: "destructive",
          });
          setIsTriggering(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (err) {
      console.error('Trigger emergency error:', err);
      setIsTriggering(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="lg"
      className={`flex items-center gap-2 px-6 py-6 h-auto rounded-full shadow-lg ${className}`}
      onClick={triggerEmergency}
      disabled={isTriggering || !user}
    >
      <AlertTriangle className="h-6 w-6" />
      <span className="text-lg font-bold">
        {isTriggering ? 'Sending Alert...' : 'Emergency'}
      </span>
    </Button>
  );
}
