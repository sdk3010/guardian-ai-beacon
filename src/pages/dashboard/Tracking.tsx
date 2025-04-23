
import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Navigation, Clock, Share2, AlertTriangle, Search, Mic, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { TrackingService, type TrackingSession, type LocationPoint } from '@/services/TrackingService';
import { loadGoogleMapsScript, initMap } from '@/lib/maps';
import VoiceAssistant from '@/components/voice/VoiceAssistant';
import { voiceSynthesis } from '@/lib/voice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  const [nearbyPlaces, setNearbyPlaces] = useState<Array<{id: string, name: string, type: string, distance: number, lat: number, lng: number}>>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrackingSession | null>(null);
  const [sessionPoints, setSessionPoints] = useState<LocationPoint[]>([]);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  
  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current) return;
    
    const initializeMap = async () => {
      try {
        // Default location (San Francisco)
        const defaultLocation = { lat: 37.7749, lng: -122.4194 };
        
        setIsLoading(true);
        
        // Try to get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              
              setCurrentLocation(pos);
              
              // Initialize map with the location
              const newMap = await initMap(mapRef, pos, nearbyPlaces);
              if (newMap) {
                setMap(newMap);
                
                // Initialize geocoder
                geocoderRef.current = new google.maps.Geocoder();
                
                // Find nearby safe places
                findNearbySafePlaces(pos);
              }
              
              setIsLoading(false);
            },
            (error) => {
              console.error('Error getting location:', error);
              toast({
                variant: "destructive",
                title: "Location Error",
                description: `Could not get your location: ${error.message}`,
              });
              
              // Initialize with default location if we can't get the user's location
              initMap(mapRef, defaultLocation, [])
                .then(newMap => {
                  if (newMap) {
                    setMap(newMap);
                    setCurrentLocation(defaultLocation);
                    geocoderRef.current = new google.maps.Geocoder();
                  }
                  setIsLoading(false);
                })
                .catch(err => {
                  console.error('Error initializing map with default location:', err);
                  setIsLoading(false);
                });
            },
            { 
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } else {
          // Browser doesn't support Geolocation
          initMap(mapRef, defaultLocation, [])
            .then(newMap => {
              if (newMap) {
                setMap(newMap);
                setCurrentLocation(defaultLocation);
                geocoderRef.current = new google.maps.Geocoder();
              }
              setIsLoading(false);
            })
            .catch(err => {
              console.error('Error initializing map with default location:', err);
              setIsLoading(false);
            });
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          variant: "destructive",
          title: "Map Error",
          description: "Could not initialize map. Please try refreshing the page.",
        });
        setIsLoading(false);
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
      setIsLoading(true);
      const history = await TrackingService.getTrackingHistory(user.id);
      setTrackingHistory(history);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading tracking history:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tracking history. Please try again.",
      });
      setIsLoading(false);
    }
  };

  const findNearbySafePlaces = (location: {lat: number, lng: number}) => {
    // Generate some realistic safe places around the location
    setTimeout(() => {
      const radius = 0.01; // roughly 1 mile
      const mockPlaces = [
        { 
          id: "place1",
          name: "Downtown Police Station", 
          type: "Police", 
          distance: 0.8,
          lat: location.lat + radius * Math.cos(0),
          lng: location.lng + radius * Math.sin(0)
        },
        { 
          id: "place2",
          name: "City Hospital", 
          type: "Hospital", 
          distance: 1.2,
          lat: location.lat + radius * Math.cos(Math.PI/2),
          lng: location.lng + radius * Math.sin(Math.PI/2)
        },
        { 
          id: "place3",
          name: "Central Fire Department", 
          type: "Fire Station", 
          distance: 1.5,
          lat: location.lat + radius * Math.cos(Math.PI),
          lng: location.lng + radius * Math.sin(Math.PI)
        },
        { 
          id: "place4",
          name: "24/7 Pharmacy", 
          type: "Pharmacy", 
          distance: 0.3,
          lat: location.lat + radius * Math.cos(3*Math.PI/2),
          lng: location.lng + radius * Math.sin(3*Math.PI/2)
        },
      ];
      
      setNearbyPlaces(mockPlaces);
      
      // Update map with safe places if it exists
      if (map && mapRef.current && currentLocation) {
        initMap(mapRef, currentLocation, mockPlaces)
          .then(newMap => {
            if (newMap) {
              setMap(newMap);
            }
          })
          .catch(err => {
            console.error('Error updating map with safe places:', err);
          });
      }
    }, 1500);
  };
  
  const handleStartTracking = async () => {
    if (!user || !currentLocation) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not determine your location or you're not logged in.",
      });
      return;
    }

    try {
      setIsLoading(true);
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
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start tracking. Please try again.",
      });
      setIsLoading(false);
    }
  };

  const handleStopTracking = async () => {
    if (!watchId || !trackingSession || !currentLocation) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No active tracking session to stop.",
      });
      return;
    }

    try {
      setIsLoading(true);
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
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error stopping tracking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not stop tracking. Please try again.",
      });
      setIsLoading(false);
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
    if (!searchQuery.trim() || !map || !geocoderRef.current) {
      toast({
        variant: "destructive",
        title: "Search Error",
        description: "Please enter a location to search.",
      });
      return;
    }
    
    setIsLoading(true);
    
    geocoderRef.current.geocode({ address: searchQuery }, (results, status) => {
      setIsLoading(false);
      
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        const newPos = {
          lat: location.lat(),
          lng: location.lng()
        };
        
        map.setCenter(newPos);
        map.setZoom(15);
        
        // Create a new marker for the searched location
        if (marker) {
          marker.setMap(null);
        }
        
        const newMarker = new google.maps.Marker({
          position: newPos,
          map: map,
          title: results[0].formatted_address,
          animation: google.maps.Animation.DROP,
        });
        
        setMarker(newMarker);
        
        // Create info window with address
        const infoWindow = new google.maps.InfoWindow({
          content: `<div><strong>${results[0].formatted_address}</strong></div>`,
        });
        
        infoWindow.open(map, newMarker);
        
        // Update nearby places for the new location
        findNearbySafePlaces(newPos);
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
  
  // View session details
  const viewSessionDetails = async (session: TrackingSession) => {
    try {
      setSelectedSession(session);
      setIsLoading(true);
      
      // Get location points for the session
      const points = await TrackingService.getLocationPoints(session.id);
      setSessionPoints(points);
      
      setShowSessionDialog(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading session details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load session details. Please try again.",
      });
      setIsLoading(false);
    }
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
            disabled={isLoading}
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
                    >
                      {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#1A1F2C]/80 z-10">
                          <div className="animate-spin mr-2 h-6 w-6 border-t-2 border-[#9b87f5] border-r-2 rounded-full"></div>
                          <span className="text-[#F1F0FB]">Loading map...</span>
                        </div>
                      )}
                    </div>
                    
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
                    disabled={isLoading}
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
                    disabled={!currentLocation || isLoading}
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
                        <li key={place.id || index} className="flex justify-between border-b border-gray-700 pb-2">
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
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin mr-2 h-6 w-6 border-t-2 border-[#9b87f5] border-r-2 rounded-full"></div>
                  <span>Loading history...</span>
                </div>
              ) : trackingHistory.length > 0 ? (
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-2 border-[#9b87f5] text-[#9b87f5]"
                        onClick={() => viewSessionDetails(session)}
                        disabled={isLoading}
                      >
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
      
      {/* Session Details Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="bg-[#232836] text-white border-[#9b87f5]/30 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-[#F1F0FB]">
              Session Details: {selectedSession?.id.substring(0, 8)}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              View detailed information about this tracking session
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Started</h3>
                <p className="text-[#F1F0FB]">{selectedSession ? formatDate(selectedSession.start_time) : ''}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400">Ended</h3>
                <p className="text-[#F1F0FB]">
                  {selectedSession?.end_time ? formatDate(selectedSession.end_time) : 'Active'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400">Status</h3>
                <p className={`font-medium ${selectedSession?.status === 'active' ? 'text-green-500' : 'text-[#F1F0FB]'}`}>
                  {selectedSession?.status.charAt(0).toUpperCase() + selectedSession?.status.slice(1)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400">Location Points</h3>
                <p className="text-[#F1F0FB]">{sessionPoints.length}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Location Timeline</h3>
              <div className="border border-gray-700 rounded-md p-4 max-h-[300px] overflow-y-auto">
                {sessionPoints.length > 0 ? (
                  <div className="space-y-4">
                    {sessionPoints.map((point, index) => (
                      <div key={point.id} className="flex items-start border-b border-gray-700 pb-2">
                        <div className="mr-4 mt-1">
                          <div className="h-4 w-4 rounded-full bg-[#9b87f5]"></div>
                          {index < sessionPoints.length - 1 && (
                            <div className="h-full w-0.5 bg-gray-700 ml-2 mt-1"></div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">
                            {formatDate(point.timestamp)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {point.location.lat.toFixed(6)}, {point.location.lng.toFixed(6)}
                            {point.accuracy && ` (Accuracy: ${point.accuracy.toFixed(1)}m)`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    <p>No location points recorded for this session</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                variant="default" 
                onClick={() => setShowSessionDialog(false)}
                className="bg-[#9b87f5] hover:bg-[#8a76e4]"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
