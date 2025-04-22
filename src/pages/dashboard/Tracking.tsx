
import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Navigation, Clock, Share2, AlertTriangle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { TrackingService, type TrackingSession, type LocationPoint } from '@/services/TrackingService';
import { loadGoogleMapsScript } from '@/lib/maps';

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
  
  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current) return;
    
    const initMap = async () => {
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
    
    initMap();
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
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <MapPin className="mr-2 h-6 w-6 text-primary" />
        Location Tracking
      </h1>
      
      <Tabs defaultValue="map">
        <TabsList className="mb-4">
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="history">Tracking History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="map">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Live Location</CardTitle>
                <CardDescription>
                  View and track your current location
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div 
                    ref={mapRef} 
                    className="w-full h-[400px] rounded-md overflow-hidden border"
                  ></div>
                  
                  <div className="absolute top-4 left-4 right-4">
                    <div className="flex gap-2 bg-background/90 backdrop-blur-sm p-2 rounded-md border shadow-sm">
                      <Input
                        placeholder="Search for a location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                        className="flex-1"
                      />
                      <Button 
                        onClick={searchLocation} 
                        disabled={isLoading}
                        size="icon"
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
                  className="flex items-center gap-2"
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
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share Location
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Tracking Options</CardTitle>
                <CardDescription>
                  Configure your tracking preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="high-accuracy">High Accuracy</Label>
                    <p className="text-sm text-muted-foreground">
                      Use GPS for precise location
                    </p>
                  </div>
                  <Switch id="high-accuracy" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="background-tracking">Background Tracking</Label>
                    <p className="text-sm text-muted-foreground">
                      Continue tracking when app is closed
                    </p>
                  </div>
                  <Switch id="background-tracking" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share-contacts">Share with Contacts</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow trusted contacts to see your location
                    </p>
                  </div>
                  <Switch id="share-contacts" />
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  Your location data is encrypted and only shared with your explicit permission.
                </p>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tracking Sessions</CardTitle>
              <CardDescription>
                View your recent location tracking activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trackingHistory.length > 0 ? (
                <div className="space-y-4">
                  {trackingHistory.map((session) => (
                    <div key={session.id} className="flex items-center justify-between border-b pb-4">
                      <div>
                        <h3 className="font-medium">
                          Tracking Session {session.id.substring(0, 8)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Started: {formatDate(session.start_time)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Status: <span className={session.status === 'active' ? 'text-green-500' : ''}>{session.status}</span>
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">No Tracking History</h3>
                  <p className="text-muted-foreground">
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
