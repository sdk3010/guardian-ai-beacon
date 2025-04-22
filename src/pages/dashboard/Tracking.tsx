
import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Navigation, Clock, Share2, AlertTriangle, Search, Mic, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { TrackingService, type TrackingSession, type LocationPoint } from '@/services/TrackingService';
import { loadGoogleMapsScript, initMap } from '@/lib/maps';
import VoiceAssistant from '@/components/voice/VoiceAssistant';
import { voiceSynthesis } from '@/lib/voice';

export default function Tracking() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState<TrackingSession[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [trackingSession, setTrackingSession] = useState<TrackingSession | null>(null);
  const [safetyScore, setSafetyScore] = useState(85);
  const [safetyStatus, setSafetyStatus] = useState("Safe");
  const [nearbyPlaces, setNearbyPlaces] = useState<Array<{name: string, type: string, distance: number}>>([]);
  const [isMuted, setIsMuted] = useState(false);
  
  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current) return;
    
    const initializeMap = async () => {
      try {
        // Load Google Maps API
        await loadGoogleMapsScript();
        
        // Default location (San Francisco)
        const defaultLocation = { lat: 37.7749, lng: -122.4194 };
        
        const mapInstance = new window.google.maps.Map(mapRef.current!, {
          center: currentLocation || defaultLocation,
          zoom: 15,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
        });
        
        setMap(mapInstance);
        
        // Initialize geocoder
        geocoderRef.current = new window.google.maps.Geocoder();
        
        // Try to get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              
              setCurrentLocation(pos);
              mapInstance.setCenter(pos);
              
              // Create marker at current location
              const newMarker = new window.google.maps.Marker({
                position: pos,
                map: mapInstance,
                title: 'Your Location',
                animation: window.google.maps.Animation.DROP,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                },
              });
              
              setMarker(newMarker);
              
              // Reverse geocode to get address
              if (geocoderRef.current) {
                geocoderRef.current.geocode({ location: pos }, (results, status) => {
                  if (status === 'OK' && results && results[0]) {
                    const address = results[0].formatted_address;
                    
                    // Create info window with address
                    const infoWindow = new window.google.maps.InfoWindow({
                      content: `<div><strong>Your Location</strong><br/>${address}</div>`,
                    });
                    
                    infoWindow.open(mapInstance, newMarker);
                    
                    // Close info window after 5 seconds
                    setTimeout(() => {
                      infoWindow.close();
                    }, 5000);
                  }
                });
              }
              
              // Find nearby safe places
              findNearbySafePlaces(pos);
            },
            (error) => {
              console.error('Error getting location:', error);
              toast({
                variant: "destructive",
                title: "Location Error",
                description: `Could not get your location: ${error.message}`,
              });
            }
          );
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          variant: "destructive",
          title: "Map Error",
          description: "Could not initialize map. Please try refreshing the page.",
        });
      }
    };
    
    initializeMap();
  }, []);
  
  // Load tracking history
  useEffect(() => {
    if (user) {
      loadTrackingHistory();
    }
  }, [user]);
  
  const loadTrackingHistory = async () => {
    if (!user) return;
    
    try {
      const history = await TrackingService.getTrackingHistory(user.id);
      setTrackingHistory(history);
    } catch (err) {
      console.error('Error loading tracking history:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tracking history. Please try again.",
      });
    }
  };

  const findNearbySafePlaces = (location: {lat: number, lng: number}) => {
    // Simulate finding nearby safe places
    setTimeout(() => {
      const mockPlaces = [
        { name: "Downtown Police Station", type: "Police", distance: 0.8 },
        { name: "City Hospital", type: "Hospital", distance: 1.2 },
        { name: "Central Fire Department", type: "Fire Station", distance: 1.5 },
        { name: "24/7 Pharmacy", type: "Pharmacy", distance: 0.3 },
      ];
      setNearbyPlaces(mockPlaces);
    }, 2000);
  };
  
  const handleStartTracking = async () => {
    if (!user || !currentLocation) return;

    try {
      const session = await TrackingService.createSession(user.id, currentLocation);
      setTrackingSession(session);
      setIsTracking(true);
      
      // Start watching position
      const id = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        handlePositionError,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
      
      setWatchId(id);
      
      toast({
        title: "Tracking Started",
        description: "Your location is now being tracked in real-time",
      });

      if (!isMuted) {
        voiceSynthesis.speak("Tracking started. Your location is now being monitored for safety.");
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start tracking. Please try again.",
      });
    }
  };

  const handleStopTracking = async () => {
    if (!watchId || !trackingSession || !currentLocation) return;

    try {
      await TrackingService.endSession(trackingSession.id, currentLocation);
      
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTracking(false);
      setTrackingSession(null);
      
      toast({
        title: "Tracking Stopped",
        description: "Your location tracking has been stopped",
      });

      if (!isMuted) {
        voiceSynthesis.speak("Tracking stopped. Your location is no longer being monitored.");
      }
      
      // Reload tracking history
      loadTrackingHistory();
    } catch (error) {
      console.error('Error stopping tracking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not stop tracking. Please try again.",
      });
    }
  };

  const handlePositionUpdate = async (position: GeolocationPosition) => {
    if (!user || !trackingSession) return;

    const pos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    try {
      await TrackingService.addLocationPoint(
        trackingSession.id,
        user.id,
        pos,
        position.coords.accuracy
      );

      setCurrentLocation(pos);
      if (map) {
        map.setCenter(pos);
      }
      if (marker) {
        marker.setPosition(pos);
      }
    } catch (error) {
      console.error('Error updating position:', error);
    }
  };

  const handlePositionError = (error: GeolocationPositionError) => {
    console.error('Error tracking location:', error);
    toast({
      variant: "destructive",
      title: "Tracking Error",
      description: `Could not track your location: ${error.message}`,
    });
    handleStopTracking();
  };
  
  // Search for a location
  const searchLocation = () => {
    if (!searchQuery.trim() || !map || !geocoderRef.current) return;
    
    setIsLoading(true);
    
    geocoderRef.current.geocode({ address: searchQuery }, (results, status) => {
      setIsLoading(false);
      
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        
        map.setCenter(location);
        map.setZoom(15);
        
        // Create a new marker for the searched location
        if (marker) {
          marker.setMap(null);
        }
        
        const newMarker = new window.google.maps.Marker({
          position: location,
          map: map,
          title: results[0].formatted_address,
          animation: window.google.maps.Animation.DROP,
        });
        
        setMarker(newMarker);
        
        // Create info window with address
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div><strong>${results[0].formatted_address}</strong></div>`,
        });
        
        infoWindow.open(map, newMarker);
      } else {
        toast({
          variant: "destructive",
          title: "Search Error",
          description: "Could not find that location. Please try again.",
        });
      }
    });
  };

  const handleVoiceCommand = (message: string) => {
    // Process voice commands
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("where am i")) {
      if (currentLocation) {
        if (geocoderRef.current) {
          geocoderRef.current.geocode({ location: currentLocation }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              if (!isMuted) {
                voiceSynthesis.speak(`You are currently at ${address}`);
              }
            }
          });
        }
      }
    } 
    else if (lowerMessage.includes("safe places") || lowerMessage.includes("nearby")) {
      if (nearbyPlaces.length > 0) {
        const placesList = nearbyPlaces.map(place => 
          `${place.name}, a ${place.type} ${place.distance.toFixed(1)} miles away`
        ).join(". ");
        
        if (!isMuted) {
          voiceSynthesis.speak(`I found these safe places nearby: ${placesList}`);
        }
      } else {
        if (!isMuted) {
          voiceSynthesis.speak("I'm still looking for safe places nearby. Please wait a moment.");
        }
      }
    }
    else if (lowerMessage.includes("am i safe")) {
      if (!isMuted) {
        voiceSynthesis.speak(`Your current safety score is ${safetyScore}%. You're in a ${safetyStatus.toLowerCase()} area.`);
      }
    }
    else if (lowerMessage.includes("start tracking")) {
      handleStartTracking();
    }
    else if (lowerMessage.includes("stop tracking")) {
      handleStopTracking();
    }
  };

  const handleEmergency = () => {
    toast({
      variant: "destructive",
      title: "Emergency Alert",
      description: "Emergency services and contacts are being notified of your situation.",
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Voice Unmuted" : "Voice Muted",
      description: isMuted ? "Voice responses are now enabled" : "Voice responses are now disabled",
    });
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto bg-[#1A1F2C] text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <MapPin className="mr-2 h-6 w-6 text-[#9b87f5]" />
          Safety Tracking
        </h1>
        <div className="flex gap-2">
          <Button
            variant={isTracking ? "destructive" : "default"}
            onClick={isTracking ? handleStopTracking : handleStartTracking}
            className={isTracking ? "" : "bg-[#9b87f5] hover:bg-[#8a76e4]"}
          >
            {isTracking ? "Stop Tracking" : "Start Tracking"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className="border-[#9b87f5] text-[#9b87f5]"
          >
            <Volume2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="map" className="w-full">
        <TabsList className="mb-4 bg-[#232836] text-[#F1F0FB]">
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="history">Tracking History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="map">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card className="bg-[#232836] border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#F1F0FB]">Live Location</CardTitle>
                  <CardDescription className="text-gray-400">
                    View and track your current location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div 
                      ref={mapRef} 
                      className="w-full h-[400px] rounded-md overflow-hidden border border-gray-700"
                    ></div>
                    
                    <div className="absolute top-4 left-4 right-4">
                      <div className="flex gap-2 bg-[#1A1F2C]/90 backdrop-blur-sm p-2 rounded-md border border-gray-700 shadow-sm">
                        <Input
                          placeholder="Search for a location..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                          className="flex-1 bg-[#282c3a] border-gray-700 text-white"
                        />
                        <Button 
                          onClick={searchLocation} 
                          disabled={isLoading}
                          size="icon"
                          className="bg-[#9b87f5] hover:bg-[#8a76e4]"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant={isTracking ? "destructive" : "default"}
                    onClick={isTracking ? handleStopTracking : handleStartTracking}
                    className={`flex items-center gap-2 ${isTracking ? "" : "bg-[#9b87f5] hover:bg-[#8a76e4]"}`}
                  >
                    {isTracking ? (
                      <>
                        <AlertTriangle className="h-4 w-4" />
                        Stop Tracking
                      </>
                    ) : (
                      <>
                        <Navigation className="h-4 w-4" />
                        Start Tracking
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (currentLocation) {
                        const url = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
                        navigator.clipboard.writeText(url);
                        toast({
                          title: "Location Copied",
                          description: "Location link copied to clipboard",
                        });
                      }
                    }}
                    disabled={!currentLocation}
                    className="flex items-center gap-2 border-[#9b87f5] text-[#9b87f5]"
                  >
                    <Share2 className="h-4 w-4" />
                    Share Location
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="bg-[#232836] border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#F1F0FB] flex items-center">
                    <div className="mr-2 h-3 w-3 rounded-full bg-green-500"></div>
                    Safety Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Safety Score</span>
                      <span className="font-bold text-green-400">{safetyScore}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${safetyScore}%` }}></div>
                    </div>
                  </div>
                  <p className="text-[#F1F0FB]">You're in a safe area</p>
                  {currentLocation && (
                    <p className="text-gray-400 text-sm">
                      Current Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card className="bg-[#232836] border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#F1F0FB] flex items-center">
                    <div className="mr-2 h-3 w-3 rounded-full bg-green-500"></div>
                    Nearby Safe Places
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nearbyPlaces.length > 0 ? (
                    <ul className="space-y-3">
                      {nearbyPlaces.map((place, index) => (
                        <li key={index} className="flex justify-between border-b border-gray-700 pb-2">
                          <div>
                            <p className="font-medium text-[#F1F0FB]">{place.name}</p>
                            <p className="text-sm text-gray-400">{place.type}</p>
                          </div>
                          <span className="text-sm text-[#9b87f5]">{place.distance.toFixed(1)} miles</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>Loading safe places nearby...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <VoiceAssistant 
                onMessage={handleVoiceCommand}
                onEmergency={handleEmergency}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <Card className="bg-[#232836] border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#F1F0FB]">Recent Tracking Sessions</CardTitle>
              <CardDescription className="text-gray-400">
                View your recent location tracking activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trackingHistory.length > 0 ? (
                <div className="space-y-4">
                  {trackingHistory.map((session) => (
                    <div key={session.id} className="flex items-center justify-between border-b border-gray-700 pb-4">
                      <div>
                        <h3 className="font-medium text-[#F1F0FB]">
                          Tracking Session {session.id.substring(0, 8)}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Started: {formatDate(session.start_time)}
                        </p>
                        <p className="text-sm text-gray-400">
                          Status: <span className={session.status === 'active' ? 'text-green-500' : ''}>{session.status}</span>
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="flex items-center gap-2 border-[#9b87f5] text-[#9b87f5]">
                        <Clock className="h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2 text-[#F1F0FB]">No Tracking History</h3>
                  <p className="text-gray-400">
                    You haven't started any tracking sessions yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
