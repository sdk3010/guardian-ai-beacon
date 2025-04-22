
declare interface Window {
  google: {
    maps: {
      Map: any;
      Marker: any;
      InfoWindow: any;
      LatLng: any;
      NavigationControl: any;
      SymbolPath: {
        CIRCLE: number;
      };
      Geocoder: any; // Added missing Geocoder type
      places: {
        PlacesService: any;
        PlacesServiceStatus: {
          OK: string;
        };
        AutocompleteService: any; // Added for completeness
        SearchBox: any; // Added for completeness
      };
      geometry: {
        spherical: {
          computeDistanceBetween: (from: any, to: any) => number;
        }
      }
    };
  };
}
