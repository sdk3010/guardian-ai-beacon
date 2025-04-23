
/**
 * Load Google Maps script dynamically
 */
export const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded');
      return resolve();
    }
    
    // Check if script is already being loaded
    if (document.getElementById('google-maps-script')) {
      console.log('Google Maps script is already being loaded');
      
      // Create a listener for when the existing script finishes loading
      window.initGoogleMaps = function() {
        console.log('Google Maps API loaded successfully from existing script');
        resolve();
      };
      
      return;
    }
    
    try {
      console.log('Loading Google Maps API...');
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDCkN5FE-8oQPVD9jYhvGjY79b7hpxAdqE&libraries=places,geometry&callback=initGoogleMaps&loading=async`;
      script.async = true;
      script.defer = true;
      
      // Define callback function
      window.initGoogleMaps = function() {
        console.log('Google Maps API loaded successfully');
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('Error loading Google Maps script:', error);
        reject(new Error('Failed to load Google Maps API'));
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error setting up Google Maps:', error);
      reject(error);
    }
  });
};

/**
 * Initialize Google Maps with current location and safe places
 */
export const initMap = async (
  mapContainerRef: React.RefObject<HTMLDivElement>,
  currentLocation: { lat: number; lng: number } | null,
  safePlaces: Array<{
    id: string;
    name: string;
    type: string;
    distance: number;
    address?: string;
    rating?: number;
    lat: number;
    lng: number;
  }> = []
): Promise<google.maps.Map | null> => {
  if (!mapContainerRef.current || !currentLocation) {
    console.error('Map container or current location not available');
    return null;
  }

  try {
    console.log('Initializing map with location:', currentLocation);
    await loadGoogleMapsScript();
    
    const mapOptions: google.maps.MapOptions = {
      center: { lat: currentLocation.lat, lng: currentLocation.lng },
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };
    
    const map = new google.maps.Map(mapContainerRef.current, mapOptions);

    // Add info window for current location
    const infoWindow = new google.maps.InfoWindow();
    
    // Try to get address for current location
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: currentLocation }, (results, status) => {
      let locationName = "Your current location";
      
      if (status === "OK" && results && results.length > 0) {
        locationName = results[0].formatted_address;
      }
      
      // Add marker for current location
      const marker = new google.maps.Marker({
        position: { lat: currentLocation.lat, lng: currentLocation.lng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
        title: "Your location",
      });
      
      // Show info window with address on click
      marker.addListener('click', () => {
        infoWindow.setContent(`
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 4px 0; font-weight: bold;">Your Location</h3>
            <p style="margin: 0;">${locationName}</p>
          </div>
        `);
        infoWindow.open(map, marker);
      });
    });

    // Add markers for safe places
    safePlaces.forEach(place => {
      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        },
        title: place.name,
      });

      const placeWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${place.name}</h3>
            <p style="margin: 0 0 4px 0;">${place.type}</p>
            <p style="margin: 0;">${place.distance.toFixed(1)} miles away</p>
            ${place.address ? `<p style="margin: 4px 0 0 0; font-size: 0.9em; color: #666;">${place.address}</p>` : ''}
          </div>
        `,
      });

      marker.addListener('click', () => {
        placeWindow.open(map, marker);
      });
    });
    
    console.log('Map initialized successfully');
    return map;
  } catch (err) {
    console.error("Error initializing map:", err);
    throw new Error("Failed to load map. Please try again.");
  }
};
