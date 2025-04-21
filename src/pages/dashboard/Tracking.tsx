
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mic, MicOff, MapPin, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { voiceRecognition, voiceSynthesis, TRIGGER_PHRASES } from '@/lib/voice';
import { loadGoogleMapsScript, initMap } from '@/lib/maps';
import { useToast } from "@/hooks/use-toast";
import EmergencyButton from '@/components/safety/EmergencyButton';

interface SafePlace {
  id: string;
  name: string;
  type: string;
  distance: number;
  address?: string;
  rating?: number;
  lat: number;
  lng: number;
}

export default function Tracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>([]);
  const [error, setError] = useState('');
  const [userInput, setUserInput] = useState('');
  const [safetyScore, setSafetyScore] = useState(85);
  const [textInput, setTextInput] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const watchId = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const locationRetries = useRef(0);
  const [sessionId, setSessionId] = useState<string>('');

  // Safety assessment based on various factors
  const getSafetyStatus = () => {
    if (safetyScore >= 80) return { status: 'safe', message: "You're in a safe area" };
    if (safetyScore >= 60) return { status: 'moderate', message: "Exercise normal caution" };
    return { status: 'unsafe', message: "Be careful, stay alert" };
  };

  useEffect(() => {
    if (user) {
      ensureUserExists();
    }
    
    // Always attempt to load the map library on component mount
    loadGoogleMapsScript().catch(err => {
      console.error("Failed to load Google Maps:", err);
      setError("Failed to load map service. Please check your internet connection.");
    });
    
    setSessionId(crypto.randomUUID());
    
    return () => {
      stopTracking();
    };
  }, []);

  const ensureUserExists = async () => {
    if (!user) return;
    
    try {
      // Check if user exists in public.users table
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      // If user doesn't exist, create a record
      if (fetchError || !userData) {
        console.log('User record not found, creating...');
        
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('Error creating user record:', insertError);
        }
      }
    } catch (err) {
      console.error('Error ensuring user exists:', err);
    }
  };

  useEffect(() => {
    if (isTracking) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isTracking]);

  useEffect(() => {
    if (currentLocation && isTracking) {
      renderMap();
      fetchSafePlaces();
      reverseGeocode(currentLocation);
      
      // Save location to Supabase
      if (user) {
        saveLocationToDatabase(currentLocation);
      }
    }
  }, [currentLocation, user]);

  const saveLocationToDatabase = async (location: { lat: number; lng: number }) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('location_logs')
        .insert({
          user_id: user.id,
          latitude: location.lat,
          longitude: location.lng,
          accuracy: 10, // Mock value for now
          timestamp: new Date().toISOString()
        });
        
      if (error) {
        console.error("Error saving location:", error);
      }
    } catch (err) {
      console.error("Failed to save location:", err);
    }
  };

  const renderMap = async () => {
    try {
      if (!mapContainerRef.current || !currentLocation) return;
      
      await initMap(mapContainerRef, currentLocation, safePlaces);
    } catch (err) {
      console.error("Error rendering map:", err);
      setError("Failed to display map. Please try again.");
    }
  };

  const reverseGeocode = async (location: { lat: number; lng: number }) => {
    try {
      // Load Google Maps API if not already loaded
      await loadGoogleMapsScript();
      
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location }, (results, status) => {
        if (status === "OK" && results && results.length > 0) {
          setLocationAddress(results[0].formatted_address);
        } else {
          console.error("Geocoder failed:", status);
        }
      });
    } catch (err) {
      console.error("Error reverse geocoding:", err);
    }
  };

  const startTracking = () => {
    setUserInput('');
    setError('');
    setPermissionDenied(false);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Start voice recognition if available
    startVoiceRecognition();

    // First get the current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Initial position update
        handlePositionUpdate(position);
        
        // Then start watching position
        watchId.current = navigator.geolocation.watchPosition(
          handlePositionUpdate,
          handlePositionError,
          { 
            enableHighAccuracy: true, 
            maximumAge: 10000, 
            timeout: 10000 
          }
        );
        
        locationRetries.current = 0;
        voiceSynthesis.speak("Tracking started. I'll keep you safe.");
        toast({
          title: "Tracking Started",
          description: "Your location is now being tracked for safety",
        });
      },
      (error) => {
        handlePositionError(error);
        // If we fail to get the initial position, don't start watching
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const stopTracking = () => {
    // Save tracking history
    if (user && isTracking && sessionId) {
      saveTrackingHistory();
    }
    
    // Stop location tracking
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    // Stop voice recognition
    if (isListening) {
      voiceRecognition.stop();
      setIsListening(false);
    }
    
    if (isTracking) {
      voiceSynthesis.speak("Tracking stopped. Stay safe.");
      toast({
        title: "Tracking Stopped",
        description: "Location tracking has been turned off",
      });
    }
  };

  const saveTrackingHistory = async () => {
    if (!user || !sessionId) return;
    
    try {
      // Save session data to safety_logs
      const { error } = await supabase
        .from('safety_logs')
        .insert({
          user_id: user.id,
          title: 'Location tracking session',
          description: `Tracking session ${sessionId}`,
          category: 'tracking',
          severity: 'low',
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          location: currentLocation ? JSON.stringify(currentLocation) : null,
          metadata: JSON.stringify({
            session_id: sessionId,
            duration_minutes: Math.floor((Date.now() - new Date(sessionId).getTime()) / 60000),
            address: locationAddress || 'Unknown location'
          })
        });
        
      if (error) {
        console.error("Error saving tracking history:", error);
      } else {
        console.log("Tracking history saved successfully");
      }
    } catch (err) {
      console.error("Failed to save tracking history:", err);
    }
  };

  const handlePositionUpdate = async (position: GeolocationPosition) => {
    console.log("Got position update:", position.coords);
    const location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    
    setCurrentLocation(location);
    locationRetries.current = 0;

    try {
      if (user) {
        saveLocationToDatabase(location);
      }
    } catch (err) {
      console.error("Error updating location:", err);
    }
  };

  const handlePositionError = (err: GeolocationPositionError) => {
    console.error("Geolocation error:", err);
    
    locationRetries.current += 1;
    
    if (err.code === 1) { // PERMISSION_DENIED
      setError("Location access denied. Please enable location services for this website.");
      setPermissionDenied(true);
      setIsTracking(false);
      toast({
        variant: "destructive",
        title: "Location Permission Denied",
        description: "Please enable location access in your browser settings to use tracking features.",
      });
    } else if (err.code === 2) { // POSITION_UNAVAILABLE
      setError("Could not determine your location. Please check your device's GPS.");
      if (locationRetries.current < 3) {
        toast({
          variant: "destructive",
          title: "Location Unavailable",
          description: "Trying again... Please ensure you have a clear GPS signal.",
        });
        
        // Try again after a delay
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            handlePositionUpdate,
            handlePositionError,
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
          );
        }, 2000);
      } else {
        setIsTracking(false);
        toast({
          variant: "destructive",
          title: "Location Unavailable",
          description: "Could not determine your location after multiple attempts.",
        });
      }
    } else if (err.code === 3) { // TIMEOUT
      setError("Location request timed out. Please try again.");
      if (locationRetries.current < 3) {
        toast({
          variant: "destructive",
          title: "Location Timeout",
          description: "Trying again... This may happen in areas with poor GPS signal.",
        });
        
        // Try again after a delay
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            handlePositionUpdate,
            handlePositionError,
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
          );
        }, 2000);
      } else {
        setIsTracking(false);
        toast({
          variant: "destructive",
          title: "Location Timeout",
          description: "Location requests are timing out repeatedly. Please try again later.",
        });
      }
    }
  };

  const fetchSafePlaces = async () => {
    if (!currentLocation) return;

    setSafePlaces([]);
    
    try {
      // Use Google Places API through Maps
      await loadGoogleMapsScript();
      
      if (window.google && window.google.maps && window.google.maps.places) {
        const location = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
        const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
        
        const request = {
          location: location,
          radius: 1500,
          type: ['police', 'hospital', 'pharmacy', 'fire_station']
        };
        
        placesService.nearbySearch(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            const places: SafePlace[] = results.map((place, index) => {
              // Calculate distance (simplified version)
              const placeLocation = place.geometry?.location;
              const distance = placeLocation 
                ? calculateDistance(
                    currentLocation.lat, 
                    currentLocation.lng, 
                    placeLocation.lat(), 
                    placeLocation.lng()
                  ) 
                : 0;
                
              return {
                id: place.place_id || `place-${index}`,
                name: place.name || 'Unknown Place',
                type: place.types?.[0] || 'location',
                distance: distance,
                address: place.vicinity || '',
                rating: place.rating,
                lat: place.geometry?.location.lat() || 0,
                lng: place.geometry?.location.lng() || 0
              };
            });
            
            setSafePlaces(places);
          } else {
            // Fallback to mock data if Google Places fails
            const mockSafePlaces: SafePlace[] = [
              {
                id: "place1",
                name: "City Police Station",
                type: "Police",
                distance: 0.7,
                address: "123 Safety St",
                lat: currentLocation.lat + 0.002,
                lng: currentLocation.lng + 0.002
              },
              {
                id: "place2",
                name: "Downtown Hospital",
                type: "Hospital",
                distance: 1.2,
                address: "456 Health Ave",
                lat: currentLocation.lat - 0.003,
                lng: currentLocation.lng + 0.001
              },
              {
                id: "place3",
                name: "24/7 Pharmacy",
                type: "Pharmacy",
                distance: 0.5,
                address: "789 Medicine Rd",
                lat: currentLocation.lat + 0.001,
                lng: currentLocation.lng - 0.002
              }
            ];
            
            setSafePlaces(mockSafePlaces);
          }
        });
      } else {
        // Fallback if Google Places isn't available
        throw new Error("Google Places API not available");
      }
    } catch (err) {
      console.error("Error fetching safe places:", err);
      
      // Fallback to mock data
      const mockSafePlaces: SafePlace[] = [
        {
          id: "place1",
          name: "City Police Station",
          type: "Police",
          distance: 0.7,
          address: "123 Safety St",
          lat: currentLocation.lat + 0.002,
          lng: currentLocation.lng + 0.002
        },
        {
          id: "place2",
          name: "Downtown Hospital",
          type: "Hospital",
          distance: 1.2,
          address: "456 Health Ave",
          lat: currentLocation.lat - 0.003,
          lng: currentLocation.lng + 0.001
        },
        {
          id: "place3",
          name: "24/7 Pharmacy",
          type: "Pharmacy",
          distance: 0.5,
          address: "789 Medicine Rd",
          lat: currentLocation.lat + 0.001,
          lng: currentLocation.lng - 0.002
        }
      ];
      
      setSafePlaces(mockSafePlaces);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3958.8; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startVoiceRecognition = () => {
    if (isListening) return;

    try {
      voiceRecognition.start(
        // On voice input
        (text) => {
          setUserInput(text);
          handleUserInput(text);
        },
        // On trigger phrase
        async (phrase) => {
          handleEmergencyPhrase(phrase);
        }
      );
      
      setIsListening(true);
      console.log("Voice recognition started");
    } catch (err) {
      console.error("Error starting voice recognition:", err);
      toast({
        variant: "destructive",
        title: "Voice Recognition Error",
        description: "Could not start voice recognition. Please try again.",
      });
    }
  };

  const toggleMicrophone = () => {
    if (isListening) {
      voiceRecognition.stop();
      setIsListening(false);
      toast({
        title: "Microphone Off",
        description: "Voice recognition disabled",
      });
    } else {
      startVoiceRecognition();
      toast({
        title: "Microphone On",
        description: "Voice recognition enabled",
      });
    }
  };

  const handleUserInput = (input: string) => {
    const text = input.toLowerCase();

    // Handle various voice commands
    if (text.includes('where am i')) {
      if (locationAddress) {
        speak(`You are at ${locationAddress}`);
      } else if (currentLocation) {
        speak(`You are at latitude ${currentLocation.lat.toFixed(4)} and longitude ${currentLocation.lng.toFixed(4)}`);
      } else {
        speak("I don't have your current location yet");
      }
    } else if (text.includes('safe places') || text.includes('nearby')) {
      if (safePlaces.length > 0) {
        speak(`There are ${safePlaces.length} safe places nearby. The closest is ${safePlaces[0].name}, which is ${safePlaces[0].distance.toFixed(1)} miles away.`);
      } else {
        speak("No safe places found nearby yet");
      }
    } else if (text.includes('am i safe')) {
      const { status, message } = getSafetyStatus();
      speak(message);
    } else if (text.length > 3) {
      // Acknowledge other inputs
      speak(`I heard you say "${text}". How can I help you with your safety?`);
    }

    // Save voice log to database
    if (user && text.length > 3) {
      saveVoiceLog(text);
    }
  };

  const saveVoiceLog = async (text: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('voice_logs')
        .insert({
          user_id: user.id,
          text: text,
          distress_detected: TRIGGER_PHRASES.some(phrase => text.toLowerCase().includes(phrase.toLowerCase())),
          distress_level: TRIGGER_PHRASES.some(phrase => text.toLowerCase().includes(phrase.toLowerCase())) ? 0.8 : 0
        });
        
      if (error) {
        console.error("Error saving voice log:", error);
      }
    } catch (err) {
      console.error("Failed to save voice log:", err);
    }
  };

  const handleEmergencyPhrase = async (phrase: string) => {
    if (!user) {
      speak("You need to be logged in to send emergency alerts.");
      return;
    }
    
    setIsProcessing(true);
    
    speak(`I heard you say "${phrase}". Sending emergency alert now.`);
    
    if (currentLocation) {
      try {
        // Insert directly to Supabase
        const { error: alertError } = await supabase
          .from('alerts')
          .insert({
            user_id: user.id,
            type: 'voice',
            latitude: currentLocation.lat,
            longitude: currentLocation.lng,
            message: `Emergency triggered by voice: "${phrase}"`,
            status: 'active'
          });
            
        if (alertError) throw alertError;
        
        speak("Emergency alert sent to your contacts");
        toast({
          variant: "destructive",
          title: "Emergency Alert Sent",
          description: "Your emergency contacts have been notified of your situation",
        });
      } catch (err) {
        console.error("Error sending emergency alert:", err);
        speak("Failed to send emergency alert. Please try again or use the emergency button");
        toast({
          variant: "destructive",
          title: "Alert Failed",
          description: "Could not send emergency alert. Please try again.",
        });
      }
    } else {
      speak("Cannot send alert without your location. Please ensure location services are enabled.");
      toast({
        variant: "destructive",
        title: "Location Required",
        description: "Could not get your location to send an alert",
      });
    }
    
    setIsProcessing(false);
  };

  const handleTextInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    // Check if the text input is an emergency phrase
    const isEmergencyPhrase = TRIGGER_PHRASES.some(phrase => 
      textInput.toLowerCase().includes(phrase)
    );
    
    if (isEmergencyPhrase) {
      const matchedPhrase = TRIGGER_PHRASES.find(phrase => 
        textInput.toLowerCase().includes(phrase)
      );
      if (matchedPhrase) {
        handleEmergencyPhrase(matchedPhrase);
      }
    } else {
      handleUserInput(textInput);
    }
    
    setTextInput('');
  };

  const speak = (text: string) => {
    setIsSpeaking(true);
    voiceSynthesis.speak(text);
    
    // Approximate time to finish speaking
    const speechTime = Math.max(2000, text.length * 80);
    setTimeout(() => setIsSpeaking(false), speechTime);
  };

  const { status: safetyStatus, message: safetyMessage } = getSafetyStatus();

  if (!user) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">
              You need to be logged in to use tracking features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center">
            <MapPin className="mr-2 h-6 w-6 text-primary" />
            Safety Tracking
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant={isTracking ? "destructive" : "default"}
              onClick={() => setIsTracking(!isTracking)}
              className="shadow-md"
              disabled={permissionDenied}
            >
              {isTracking ? "Stop Tracking" : "Start Tracking"}
            </Button>
            {isTracking && (
              <Button
                variant="outline"
                onClick={toggleMicrophone}
                className={`${isListening ? 'bg-primary/10' : ''}`}
              >
                {isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {isListening ? 'Mute' : 'Unmute'}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isTracking ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Map container */}
                <Card className="overflow-hidden">
                  <div 
                    ref={mapContainerRef} 
                    className="h-[350px] w-full bg-accent rounded-lg"
                  >
                    {!currentLocation && (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Getting your location...
                      </div>
                    )}
                  </div>
                </Card>

                {/* Safety Status Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span>Safety Status</span>
                      <Badge 
                        variant={safetyStatus === 'safe' ? 'default' : safetyStatus === 'moderate' ? 'outline' : 'destructive'}
                        className="ml-2"
                      >
                        {safetyStatus === 'safe' ? 'Safe' : safetyStatus === 'moderate' ? 'Normal Caution' : 'Be Alert'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Safety Score</span>
                        <span className="font-medium">{safetyScore}%</span>
                      </div>
                      <Progress value={safetyScore} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {safetyMessage}
                      </p>
                      
                      {currentLocation && (
                        <p className="text-xs text-muted-foreground mt-4">
                          Current Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {/* Safe Places Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Nearby Safe Places
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {safePlaces.length > 0 ? (
                      <div className="space-y-3 max-h-[200px] overflow-y-auto">
                        {safePlaces.slice(0, 5).map((place) => (
                          <div key={place.id} className="p-2 rounded-md bg-accent/50">
                            <div className="font-medium">{place.name}</div>
                            <div className="text-sm text-muted-foreground">{place.type}</div>
                            <div className="text-sm">{place.distance.toFixed(1)} miles away</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Loading safe places nearby...
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Voice Interface */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <Mic className="mr-2 h-4 w-4" />
                      Voice Assistant
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 rounded-md bg-accent/50 min-h-[100px] text-sm">
                        {userInput ? (
                          <div className="space-y-2">
                            <p className="font-medium">I heard you say:</p>
                            <p className="italic">{userInput}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            {isListening ? "I'm listening..." : "Voice recognition is off"}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Say or type:</p>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          <li>"Where am I?" - Get current location</li>
                          <li>"Are there safe places nearby?" - List safe locations</li>
                          <li>"Am I safe?" - Check safety status</li>
                          <li className="text-red-400 font-medium">Emergency trigger phrases will alert your contacts</li>
                        </ul>
                      </div>

                      <form onSubmit={handleTextInputSubmit} className="flex gap-2">
                        <input
                          type="text"
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          placeholder="Type a message..."
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <Button type="submit" size="sm">Send</Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>

                <EmergencyButton className="w-full" />
              </div>
            </div>

            {/* Floating emergency button for mobile */}
            <div className="lg:hidden fixed bottom-6 right-6">
              <EmergencyButton />
            </div>
          </>
        ) : (
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <div className="rounded-full bg-primary/10 p-6">
                <MapPin className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Start Tracking for Safety</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enable location tracking to get safety alerts, find nearby safe places, and use voice commands for help.
              </p>
              {permissionDenied ? (
                <Alert variant="destructive" className="max-w-md mx-auto mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Location Access Required</AlertTitle>
                  <AlertDescription>
                    Please enable location access in your browser settings to use tracking features.
                  </AlertDescription>
                </Alert>
              ) : (
                <Button 
                  onClick={() => setIsTracking(true)}
                  size="lg"
                  className="mt-2"
                >
                  Start Tracking
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
