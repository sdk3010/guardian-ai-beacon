
declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        Marker: any;
        InfoWindow: any;
        LatLng: any;
        NavigationControl: any;
        Animation: {
          DROP: number;
          BOUNCE: number;
        };
        SymbolPath: {
          CIRCLE: number;
        };
        Geocoder: any;
        places: {
          PlacesService: any;
          PlacesServiceStatus: {
            OK: string;
          };
          AutocompleteService: any;
          SearchBox: any;
        };
        geometry: {
          spherical: {
            computeDistanceBetween: (from: any, to: any) => number;
          }
        }
      };
    };
  }
}

// This export is needed to make this a module
export {};
