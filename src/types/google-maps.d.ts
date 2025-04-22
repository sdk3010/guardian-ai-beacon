
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
      Geocoder: any;
      places: {
        PlacesService: any;
        PlacesServiceStatus: {
          OK: string;
        };
      };
      geometry: {
        spherical: {
          computeDistanceBetween: (from: any, to: any) => number;
        }
      }
    };
  };
}
