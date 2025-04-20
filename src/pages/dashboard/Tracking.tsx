
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { tracking, alerts } from '@/lib/api';
import { voiceRecognition, voiceSynthesis } from '@/lib/voice';

export default function Tracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [safePlaces, setSafePlaces] = useState([]);
  const [error, setError] = useState('');
  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    if (isTracking) {
      startTracking();
      startVoiceRecognition();
    }

    return () => {
      voiceRecognition.stop();
    };
  }, [isTracking]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(location);

        try {
          // Update tracking location
          await tracking.start(location);
          
          // Get nearby safe places
          const response = await tracking.getSafePlaces(location);
          setSafePlaces(response.data);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Error updating location');
        }
      },
      (err) => {
        setError(`Error getting location: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  const startVoiceRecognition = () => {
    voiceRecognition.start(
      // On voice input
      (text) => {
        setUserInput(text);
        handleUserInput(text);
      },
      // On trigger phrase
      async () => {
        if (currentLocation) {
          try {
            await alerts.triggerEmergency(currentLocation);
            voiceSynthesis.speak("Emergency alert sent to your contacts");
          } catch (err) {
            voiceSynthesis.speak("Failed to send emergency alert");
          }
        }
      }
    );
  };

  const handleUserInput = (input: string) => {
    // Add your voice command logic here
    const text = input.toLowerCase();

    if (text.includes('where am i')) {
      if (currentLocation) {
        voiceSynthesis.speak(`You are at latitude ${currentLocation.lat.toFixed(2)} and longitude ${currentLocation.lng.toFixed(2)}`);
      }
    } else if (text.includes('safe places')) {
      if (safePlaces.length > 0) {
        voiceSynthesis.speak(`There are ${safePlaces.length} safe places nearby`);
      } else {
        voiceSynthesis.speak("No safe places found nearby");
      }
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Live Tracking</h1>
          <Button
            onClick={() => setIsTracking(!isTracking)}
            variant={isTracking ? "destructive" : "default"}
          >
            {isTracking ? "Stop Tracking" : "Start Tracking"}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md">
            {error}
          </div>
        )}

        {isTracking && (
          <>
            <div className="p-4 border rounded-lg">
              <h2 className="font-medium mb-2">Voice Commands</h2>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>"Where am I?" - Get current location</li>
                <li>"Safe places" - List nearby safe places</li>
                <li>"Help me" - Trigger emergency alert</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <h2 className="font-medium mb-2">Current Location</h2>
              {currentLocation ? (
                <p className="text-sm">
                  Lat: {currentLocation.lat.toFixed(6)}, 
                  Lng: {currentLocation.lng.toFixed(6)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Getting location...
                </p>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <h2 className="font-medium mb-2">Voice Input</h2>
              <p className="text-sm italic">{userInput || "Listening..."}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
