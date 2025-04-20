
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { alerts } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { voiceSynthesis } from '@/lib/voice';

interface EmergencyButtonProps {
  className?: string;
}

export default function EmergencyButton({ className }: EmergencyButtonProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const { toast } = useToast();

  const triggerEmergency = async () => {
    if (isTriggering) return;
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
            await alerts.triggerEmergency(location, "Emergency button pressed");
            
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
      disabled={isTriggering}
    >
      <AlertTriangle className="h-6 w-6" />
      <span className="text-lg font-bold">
        {isTriggering ? 'Sending Alert...' : 'Emergency'}
      </span>
    </Button>
  );
}
