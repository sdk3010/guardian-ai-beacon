
interface Window {
  google: typeof google;
  initGoogleMaps: () => void;
}

declare namespace google.maps {
  export class Map {
    constructor(mapDiv: Element | null, opts?: MapOptions);
    setCenter(latLng: LatLng | LatLngLiteral): void;
    setZoom(zoom: number): void;
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
    addListener(eventName: string, handler: Function): google.maps.MapsEventListener;
  }

  export interface MarkerOptions {
    position?: LatLng | LatLngLiteral;
    map?: Map;
    title?: string;
    icon?: string | Icon;
  }

  export interface Icon {
    url: string;
    scaledSize?: Size;
  }

  export class Size {
    constructor(width: number, height: number);
  }

  export interface MapsEventListener {
    remove(): void;
  }
}
