
declare global {
  interface Window {
    google: {
      maps: {
        Map: typeof google.maps.Map;
        Marker: typeof google.maps.Marker;
        InfoWindow: typeof google.maps.InfoWindow;
        LatLng: typeof google.maps.LatLng;
        MapOptions: google.maps.MapOptions;
        SymbolPath: {
          CIRCLE: number;
          FORWARD_CLOSED_ARROW: number;
          FORWARD_OPEN_ARROW: number;
          BACKWARD_CLOSED_ARROW: number;
          BACKWARD_OPEN_ARROW: number;
        };
        MapMouseEvent: google.maps.MapMouseEvent;
        Geocoder: typeof google.maps.Geocoder;
        GeocoderStatus: typeof google.maps.GeocoderStatus;
        NavigationControl: typeof google.maps.NavigationControl;
        Animation: {
          DROP: number;
          BOUNCE: number;
        };
      };
    };
    initGoogleMaps: () => void;
  }
}

export {};
