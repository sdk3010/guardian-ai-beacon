
/**
 * Load Google Maps script dynamically
 */
export const loadGoogleMapsScript = (): Promise<void> => {
  if (window.google && window.google.maps) return Promise.resolve();
  
  return new Promise<void>((resolve, reject) => {
    if (document.getElementById('google-maps-script')) {
      return resolve();
    }
    
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyC2jY46Jht0MIpfHNYwBftGTVVjfTmNAXk&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (error) => reject(error);
    document.head.appendChild(script);
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
  }>
): Promise<void> => {
  if (!mapContainerRef.current || !currentLocation) return;

  try {
    await loadGoogleMapsScript();
    
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: currentLocation.lat, lng: currentLocation.lng },
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // Add marker for current location
    new window.google.maps.Marker({
      position: { lat: currentLocation.lat, lng: currentLocation.lng },
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      },
      title: "Your location",
    });

    // Add markers for safe places
    safePlaces.forEach(place => {
      const marker = new window.google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        },
        title: place.name,
      });

      const infoWindow = new window.google.maps.InfoWindow({
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
        infoWindow.open(map, marker);
      });
    });
  } catch (err) {
    console.error("Error initializing map:", err);
    throw new Error("Failed to load map. Please try again.");
  }
};
