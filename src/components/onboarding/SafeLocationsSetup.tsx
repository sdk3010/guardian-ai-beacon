
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { useSafeLocations } from '@/hooks/useSafeLocations';
import SafeLocationMarker from '@/components/maps/SafeLocationMarker';
import { loadGoogleMapsScript, initMap } from '@/lib/maps';

export default function SafeLocationsSetup() {
  const [showDialog, setShowDialog] = useState(false);
  const { safeLocations, isLoading, addSafeLocation } = useSafeLocations();
  const { toast } = useToast();
  const { user } = useAuth();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number} | null>(null);

  useEffect(() => {
    if (showDialog) {
      initializeMap();
    }
  }, [showDialog]);

  const initializeMap = async () => {
    try {
      await loadGoogleMapsScript();
      
      // Default to Hyderabad center
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

  const setupMap = async (center: {lat: number; lng: number}) => {
    const mapContainer = document.getElementById('safe-locations-map');
    if (!mapContainer) return;

    const newMap = new window.google.maps.Map(mapContainer, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // Add existing safe locations to map
    safeLocations.forEach(location => {
      new window.google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: newMap,
        title: location.name,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        },
      });
    });

    // Handle map clicks for adding new locations
    newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      
      const clickedLocation = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };

      // Limit to 9 locations
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

    setMap(newMap);
  };

  const handleSaveLocation = async (locationData: {
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
  }) => {
    try {
      await addSafeLocation(locationData);
      setSelectedLocation(null);
      toast({
        title: "Success",
        description: "Safe location added successfully",
      });

      // If minimum requirement met, allow closing
      if (safeLocations.length >= 2) {
        setShowDialog(false);
      }
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  // Show dialog if user has less than 3 safe locations
  useEffect(() => {
    if (user && !isLoading && safeLocations.length < 3) {
      setShowDialog(true);
    }
  }, [user, isLoading, safeLocations.length]);

  return (
    <Dialog open={showDialog} onOpenChange={(open) => {
      if (safeLocations.length >= 3) {
        setShowDialog(open);
      }
    }}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Set Up Safe Locations</DialogTitle>
          <DialogDescription>
            Please mark at least 3 safe locations on the map. Click anywhere to add a location.
            {safeLocations.length}/3 locations added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div id="safe-locations-map" className="w-full h-[400px] rounded-lg overflow-hidden" />
          
          {selectedLocation && (
            <SafeLocationMarker
              lat={selectedLocation.lat}
              lng={selectedLocation.lng}
              onSave={handleSaveLocation}
              onCancel={() => setSelectedLocation(null)}
            />
          )}

          {safeLocations.length >= 3 && (
            <div className="flex justify-end">
              <Button onClick={() => setShowDialog(false)}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
