
declare global {
  interface Window {
    google: {
      maps: {
        Map: new (mapDiv: HTMLElement, opts?: google.maps.MapOptions) => google.maps.Map;
        Marker: new (opts?: google.maps.MarkerOptions) => google.maps.Marker;
        InfoWindow: new (opts?: google.maps.InfoWindowOptions) => google.maps.InfoWindow;
        LatLng: new (lat: number, lng: number) => google.maps.LatLng;
        MapOptions: google.maps.MapOptions;
        Geocoder: new () => google.maps.Geocoder;
        NavigationControl: new () => google.maps.NavigationControl;
        SymbolPath: {
          CIRCLE: number;
          FORWARD_CLOSED_ARROW: number;
          FORWARD_OPEN_ARROW: number;
          BACKWARD_CLOSED_ARROW: number;
          BACKWARD_OPEN_ARROW: number;
        };
        Animation: {
          DROP: number;
          BOUNCE: number;
        };
      };
    };
    initGoogleMaps: () => void;
  }
}

declare namespace google.maps {
  class Map {
    constructor(mapDiv: HTMLElement, opts?: MapOptions);
    setCenter(latLng: LatLng | { lat: number; lng: number }): void;
    getCenter(): LatLng;
    setZoom(zoom: number): void;
    getZoom(): number;
    addListener(event: string, handler: Function): MapsEventListener;
    fitBounds(bounds: LatLngBounds): void;
    setOptions(options: MapOptions): void;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    setPosition(latLng: LatLng | { lat: number; lng: number }): void;
    getPosition(): LatLng;
    setMap(map: Map | null): void;
    addListener(event: string, handler: Function): MapsEventListener;
    setAnimation(animation: number | null): void;
    setIcon(icon: string | Icon | Symbol): void;
    getMap(): Map | null;
  }

  interface MapsEventListener {
    remove(): void;
  }

  interface MapOptions {
    center?: LatLng | { lat: number; lng: number };
    clickableIcons?: boolean;
    disableDefaultUI?: boolean;
    disableDoubleClickZoom?: boolean;
    draggable?: boolean;
    draggableCursor?: string;
    fullscreenControl?: boolean;
    gestureHandling?: string;
    keyboardShortcuts?: boolean;
    mapTypeControl?: boolean;
    mapTypeId?: string;
    maxZoom?: number;
    minZoom?: number;
    rotateControl?: boolean;
    scaleControl?: boolean;
    scrollwheel?: boolean;
    streetViewControl?: boolean;
    styles?: any[];
    tilt?: number;
    zoom?: number;
    zoomControl?: boolean;
  }

  interface MarkerOptions {
    position: LatLng | { lat: number; lng: number };
    map?: Map;
    animation?: number;
    clickable?: boolean;
    crossOnDrag?: boolean;
    cursor?: string;
    draggable?: boolean;
    icon?: string | Icon | Symbol;
    label?: string | MarkerLabel;
    opacity?: number;
    optimized?: boolean;
    title?: string;
    visible?: boolean;
    zIndex?: number;
  }

  interface MarkerLabel {
    color: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    text: string;
  }

  interface Icon {
    url: string;
    size?: Size;
    scaledSize?: Size;
    origin?: Point;
    anchor?: Point;
    labelOrigin?: Point;
    path?: string;
  }

  interface Symbol {
    path: string | number;
    anchor?: Point;
    fillColor?: string;
    fillOpacity?: number;
    labelOrigin?: Point;
    rotation?: number;
    scale?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
    toString(): string;
    toJSON(): { lat: number; lng: number };
  }

  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng);
    extend(point: LatLng | { lat: number; lng: number }): LatLngBounds;
    getCenter(): LatLng;
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
    isEmpty(): boolean;
  }

  class Size {
    constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
    width: number;
    height: number;
    equals(other: Size): boolean;
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
    equals(other: Point): boolean;
  }

  class InfoWindow {
    constructor(opts?: InfoWindowOptions);
    open(map: Map, anchor?: Marker): void;
    close(): void;
    setContent(content: string | Element): void;
    getContent(): string | Element;
    setPosition(position: LatLng | { lat: number; lng: number }): void;
    getPosition(): LatLng;
  }

  interface InfoWindowOptions {
    content?: string | Element;
    disableAutoPan?: boolean;
    maxWidth?: number;
    pixelOffset?: Size;
    position?: LatLng | { lat: number; lng: number };
    zIndex?: number;
  }

  class Geocoder {
    geocode(
      request: GeocoderRequest,
      callback: (results: GeocoderResult[], status: GeocoderStatus) => void
    ): void;
  }

  interface GeocoderRequest {
    address?: string;
    location?: LatLng | { lat: number; lng: number };
    placeId?: string;
    bounds?: LatLngBounds;
    componentRestrictions?: GeocoderComponentRestrictions;
    region?: string;
  }

  interface GeocoderComponentRestrictions {
    route?: string;
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    country?: string;
  }

  interface GeocoderResult {
    address_components: {
      long_name: string;
      short_name: string;
      types: string[];
    }[];
    formatted_address: string;
    geometry: {
      location: LatLng;
      location_type: string;
      viewport: LatLngBounds;
      bounds?: LatLngBounds;
    };
    place_id: string;
    types: string[];
    partial_match?: boolean;
  }

  type GeocoderStatus =
    | 'OK'
    | 'ZERO_RESULTS'
    | 'OVER_QUERY_LIMIT'
    | 'REQUEST_DENIED'
    | 'INVALID_REQUEST'
    | 'UNKNOWN_ERROR'
    | 'ERROR';

  interface MapMouseEvent extends Event {
    latLng: LatLng;
    stop(): void;
  }
}

export {};
