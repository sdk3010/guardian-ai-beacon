
interface Window {
  google: typeof google;
  initGoogleMaps: () => void;
}

declare namespace google.maps {
  export class Map {
    constructor(mapDiv: Element | null, opts?: MapOptions);
    setCenter(latLng: LatLng | LatLngLiteral): void;
    setZoom(zoom: number): void;
    getCenter(): LatLng;
    getZoom(): number;
    setOptions(options: MapOptions): void;
    addListener(eventName: string, handler: Function): google.maps.MapsEventListener;
  }
  
  export interface MapOptions {
    center?: LatLng | LatLngLiteral;
    zoom?: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
  }
  
  export interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  
  export class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  export class Marker {
    constructor(opts?: MarkerOptions);
    setMap(map: Map | null): void;
    setPosition(latLng: LatLng | LatLngLiteral): void;
    getPosition(): LatLng;
    addListener(eventName: string, handler: Function): google.maps.MapsEventListener;
    setAnimation(animation: number | null): void;
  }

  export interface MarkerOptions {
    position?: LatLng | LatLngLiteral;
    map?: Map;
    title?: string;
    icon?: string | Icon;
    animation?: number;
  }

  export interface Icon {
    url?: string;
    scaledSize?: Size;
    path?: number;
  }

  export class Size {
    constructor(width: number, height: number);
  }

  export interface MapsEventListener {
    remove(): void;
  }

  export class InfoWindow {
    constructor(opts?: InfoWindowOptions);
    open(map: Map, anchor?: Marker): void;
    close(): void;
    setContent(content: string | Element): void;
  }

  export interface InfoWindowOptions {
    content?: string | Element;
    disableAutoPan?: boolean;
    maxWidth?: number;
  }

  export class Geocoder {
    geocode(
      request: GeocoderRequest,
      callback: (results: GeocoderResult[], status: string) => void
    ): void;
  }

  export interface GeocoderRequest {
    address?: string;
    location?: LatLng | LatLngLiteral;
  }

  export interface GeocoderResult {
    geometry: {
      location: LatLng;
    };
    formatted_address: string;
  }

  export interface MapMouseEvent extends Event {
    latLng: LatLng;
  }

  export class NavigationControl {
    constructor();
  }

  export const Animation: {
    BOUNCE: number;
    DROP: number;
  };

  export const SymbolPath: {
    CIRCLE: number;
    FORWARD_CLOSED_ARROW: number;
  };
}
