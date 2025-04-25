
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useSafeLocations } from '@/hooks/useSafeLocations';
import SafeLocationMarker from '@/components/maps/SafeLocationMarker';
import { loadGoogleMapsScript } from '@/lib/maps';
import { MapPin } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

export default function SafeLocationsSetup() {
  const [showDialog, setShowDialog] = useState(false);
  const [showManualSetup, setShowManualSetup] = useState(false);
  const { safeLocations, isLoading, addSafeLocation } = useSafeLocations();
  const { toast } = useToast();
  const { user } = useAuth();
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number} | null>(null);
  const [hasCheckedPrompt, setHasCheckedPrompt] = useState(false);

  useEffect(() => {
    if (user && !hasCheckedPrompt) {
      checkUserPromptStatus();
    }
  }, [user, hasCheckedPrompt]);

  const checkUserPromptStatus = async () => {
    if (!user) return;

    try {
      const { data: userSettings, error } = await supabase
        .from('user_settings')
        .select('has_seen_location_prompt')
        .eq('user_id', user.id)
        .single();
      
      // Check if query was successful and if the user hasn't seen the prompt
      if (!error && userSettings && userSettings.has_seen_location_prompt === false && safeLocations.length < 3) {
        setShowDialog(true);
      }
      setHasCheckedPrompt(true);
    } catch (error) {
      console.error('Error checking prompt status:', error);
    }
  };

  const handleRemindLater = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          has_seen_location_prompt: true
        });

      setShowDialog(false);
      toast({
        description: "You can add safe locations later from your dashboard",
      });
    } catch (error) {
      console.error('Error updating user settings:', error);
    }
  };

  useEffect(() => {
    if (user && !isLoading && !hasCheckedPrompt) {
      if (safeLocations.length < 3) {
        setShowDialog(true);
      }
    }
  }, [user, isLoading, safeLocations.length, hasCheckedPrompt]);

  useEffect(() => {
    return () => {
      if (mapContainerRef.current && mapRef.current) {
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (showDialog || showManualSetup) {
      initializeMap();
    }
  }, [showDialog, showManualSetup]);

  const initializeMap = async () => {
    if (!mapContainerRef.current) {
      return;
    }

    try {
      await loadGoogleMapsScript();
      
      const defaultLocation = { lat: 17.3850, lng: 78.4867 };
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setupMap(userLocation);
          },
          () => {
            setupMap(defaultLocation);
          }
        );
      } else {
        setupMap(defaultLocation);
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        variant: "destructive",
        title: "Map Error",
        description: "Could not initialize the map",
      });
    }
  };

  const setupMap = (center: {lat: number; lng: number}) => {
    if (!mapContainerRef.current || !window.google || !window.google.maps) {
      console.error('Map container or Google Maps not available');
      return;
    }

    const newMap = new window.google.maps.Map(mapContainerRef.current, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapRef.current = newMap;

    safeLocations.forEach(location => {
      if (!mapRef.current || !window.google || !window.google.maps) return;
      
      new window.google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: newMap,
        title: location.name,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        },
      });
    });

    newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      
      const clickedLocation = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };

      if (safeLocations.length >= 9) {
        toast({
          variant: "destructive",
          title: "Maximum Locations Reached",
          description: "You can only add up to 9 safe locations",
        });
        return;
      }

      setSelectedLocation(clickedLocation);
    });
  };

  const handleSaveLocation = async (locationData: {
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    radius: number;
    user_id: string;
  }) => {
    try {
      await addSafeLocation(locationData);
      setSelectedLocation(null);
      
      toast({
        title: "Success",
        description: "Safe location added successfully",
      });
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add safe location",
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      handleRemindLater();
    }
    setShowDialog(open);
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Set Up Safe Locations</DialogTitle>
            <DialogDescription>
              Please mark at least 3 safe locations on the map. Click anywhere to add a location.
              {safeLocations.length}/3 locations added.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div 
              id="safe-locations-map" 
              ref={mapContainerRef}
              className="w-full h-[400px] rounded-lg overflow-hidden" 
            />
            
            {selectedLocation && (
              <SafeLocationMarker
                lat={selectedLocation.lat}
                lng={selectedLocation.lng}
                onSave={handleSaveLocation}
                onCancel={() => setSelectedLocation(null)}
              />
            )}
            
            <DialogFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handleRemindLater}
              >
                Remind Me Later
              </Button>
              
              {safeLocations.length >= 3 && (
                <Button onClick={() => setShowDialog(false)}>
                  Done
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 mb-4"
        onClick={() => setShowManualSetup(true)}
      >
        <MapPin className="h-4 w-4" />
        Manage Safe Locations
      </Button>

      <Sheet open={showManualSetup} onOpenChange={setShowManualSetup}>
        <SheetContent className="sm:max-w-[800px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Manage Safe Locations</SheetTitle>
            <SheetDescription>
              You can add up to 9 safe locations. Click anywhere on the map to add a location.
              {safeLocations.length}/9 locations added.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-6">
            <div 
              id="safe-locations-map" 
              ref={mapContainerRef}
              className="w-full h-[400px] rounded-lg overflow-hidden" 
            />
            
            {selectedLocation && (
              <SafeLocationMarker
                lat={selectedLocation.lat}
                lng={selectedLocation.lng}
                onSave={handleSaveLocation}
                onCancel={() => setSelectedLocation(null)}
              />
            )}
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Your Safe Locations</h3>
              
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : safeLocations.length > 0 ? (
                <div className="grid gap-2">
                  {safeLocations.map((location) => (
                    <div 
                      key={location.id} 
                      className="flex justify-between items-center p-3 border rounded-md"
                    >
                      <div>
                        <p className="font-medium">{location.name}</p>
                        {location.description && (
                          <p className="text-sm text-muted-foreground">{location.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-md bg-muted/20">
                  <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No safe locations added yet</p>
                </div>
              )}
            </div>
            
            <SheetFooter>
              <Button onClick={() => setShowManualSetup(false)}>
                Done
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
