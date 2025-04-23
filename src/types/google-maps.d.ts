
// This adds type definitions for Google Maps API
declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: HTMLElement, options?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      getCenter(): LatLng;
      setZoom(zoom: number): void;
      getZoom(): number;
      setOptions(options: MapOptions): void;
      panTo(latLng: LatLng | LatLngLiteral): void;
      panBy(x: number, y: number): void;
      fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
      getBounds(): LatLngBounds;
      getDiv(): HTMLElement;
      addListener(eventName: string, handler: Function): MapsEventListener;
    }
    
    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeId?: string;
      fullscreenControl?: boolean;
      streetViewControl?: boolean;
      mapTypeControl?: boolean;
      zoomControl?: boolean;
      styles?: any[];
    }
    
    class LatLng {
      constructor(lat: number, lng: number, noWrap?: boolean);
      lat(): number;
      lng(): number;
      equals(other: LatLng): boolean;
      toString(): string;
      toUrlValue(precision?: number): string;
    }
    
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    
    class LatLngBounds {
      constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      contains(latLng: LatLng | LatLngLiteral): boolean;
      getCenter(): LatLng;
      getSouthWest(): LatLng;
      getNorthEast(): LatLng;
      toJSON(): LatLngBoundsLiteral;
      toString(): string;
      toUrlValue(precision?: number): string;
      union(bounds: LatLngBounds | LatLngBoundsLiteral): LatLngBounds;
    }
    
    interface LatLngBoundsLiteral {
      east: number;
      north: number;
      south: number;
      west: number;
    }
    
    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setPosition(latLng: LatLng | LatLngLiteral): void;
      getPosition(): LatLng | null;
      setTitle(title: string): void;
      getTitle(): string;
      setVisible(visible: boolean): void;
      getVisible(): boolean;
      setZIndex(zIndex: number): void;
      getZIndex(): number;
      setIcon(icon: string | Icon | Symbol): void;
      setAnimation(animation: any): void;
      setDraggable(draggable: boolean): void;
      addListener(eventName: string, handler: Function): MapsEventListener;
    }
    
    interface MarkerOptions {
      position: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: string | Icon | Symbol;
      label?: string | MarkerLabel;
      draggable?: boolean;
      clickable?: boolean;
      visible?: boolean;
      zIndex?: number;
      opacity?: number;
      animation?: any;
    }
    
    interface MarkerLabel {
      text: string;
      color?: string;
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
    }
    
    interface Icon {
      url: string;
      size?: Size;
      scaledSize?: Size;
      origin?: Point;
      anchor?: Point;
      labelOrigin?: Point;
    }
    
    class Symbol {
      constructor(opts: SymbolOptions);
    }
    
    interface SymbolOptions {
      path: SymbolPath | string;
      fillColor?: string;
      fillOpacity?: number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      anchor?: Point;
      labelOrigin?: Point;
      rotation?: number;
    }
    
    enum SymbolPath {
      BACKWARD_CLOSED_ARROW,
      BACKWARD_OPEN_ARROW,
      CIRCLE,
      FORWARD_CLOSED_ARROW,
      FORWARD_OPEN_ARROW
    }
    
    class Size {
      constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
      width: number;
      height: number;
      equals(other: Size): boolean;
      toString(): string;
    }
    
    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
      equals(other: Point): boolean;
      toString(): string;
    }
    
    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map: Map, anchor?: Marker): void;
      close(): void;
      setContent(content: string | Node): void;
      getContent(): string | Node;
      setPosition(position: LatLng | LatLngLiteral): void;
      getPosition(): LatLng | null;
      setZIndex(zIndex: number): void;
      getZIndex(): number;
    }
    
    interface InfoWindowOptions {
      content?: string | Node;
      position?: LatLng | LatLngLiteral;
      maxWidth?: number;
      pixelOffset?: Size;
      zIndex?: number;
      disableAutoPan?: boolean;
    }
    
    class Geocoder {
      constructor();
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
    }
    
    interface GeocoderRequest {
      address?: string;
      location?: LatLng | LatLngLiteral;
      bounds?: LatLngBounds | LatLngBoundsLiteral;
      componentRestrictions?: GeocoderComponentRestrictions;
      region?: string;
    }
    
    interface GeocoderComponentRestrictions {
      country: string | string[];
    }
    
    interface GeocoderResult {
      address_components: GeocoderAddressComponent[];
      formatted_address: string;
      geometry: GeocoderGeometry;
      partial_match: boolean;
      place_id: string;
      plus_code?: { global_code: string; compound_code: string };
      postcode_localities?: string[];
      types: string[];
    }
    
    interface GeocoderAddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }
    
    interface GeocoderGeometry {
      location: LatLng;
      location_type: GeocoderLocationType;
      viewport: LatLngBounds;
      bounds?: LatLngBounds;
    }
    
    enum GeocoderLocationType {
      APPROXIMATE,
      GEOMETRIC_CENTER,
      RANGE_INTERPOLATED,
      ROOFTOP
    }
    
    type GeocoderStatus = "OK" | "ZERO_RESULTS" | "OVER_QUERY_LIMIT" | "REQUEST_DENIED" | "INVALID_REQUEST" | "UNKNOWN_ERROR";
    
    class NavigationControl {
      constructor(options?: NavigationControlOptions);
    }
    
    interface NavigationControlOptions {
      position?: ControlPosition;
    }
    
    enum ControlPosition {
      BOTTOM_CENTER,
      BOTTOM_LEFT,
      BOTTOM_RIGHT,
      LEFT_BOTTOM,
      LEFT_CENTER,
      LEFT_TOP,
      RIGHT_BOTTOM,
      RIGHT_CENTER,
      RIGHT_TOP,
      TOP_CENTER,
      TOP_LEFT,
      TOP_RIGHT
    }
    
    interface MapsEventListener {
      remove(): void;
    }
    
    namespace places {
      class PlacesService {
        constructor(attrContainer: Map | HTMLDivElement);
        findPlaceFromQuery(request: FindPlaceFromQueryRequest, callback: (results: PlaceResult[], status: PlacesServiceStatus) => void): void;
        nearbySearch(request: NearbySearchRequest, callback: (results: PlaceResult[], status: PlacesServiceStatus, pagination: PlaceSearchPagination) => void): void;
        getDetails(request: PlaceDetailsRequest, callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void): void;
      }
      
      interface FindPlaceFromQueryRequest {
        query: string;
        fields: string[];
        locationBias?: LocationBias;
      }
      
      interface NearbySearchRequest {
        location: LatLng | LatLngLiteral;
        radius?: number;
        rankBy?: RankBy;
        keyword?: string;
        type?: string;
      }
      
      interface PlaceDetailsRequest {
        placeId: string;
        fields?: string[];
      }
      
      enum RankBy {
        PROMINENCE,
        DISTANCE
      }
      
      type LocationBias = LatLng | LatLngLiteral | LatLngBounds | LatLngBoundsLiteral | Circle | string;
      
      interface Circle {
        center: LatLng | LatLngLiteral;
        radius: number;
      }
      
      interface PlaceResult {
        formatted_address?: string;
        geometry?: PlaceGeometry;
        icon?: string;
        name?: string;
        place_id?: string;
        types?: string[];
        vicinity?: string;
      }
      
      interface PlaceGeometry {
        location: LatLng;
        viewport: LatLngBounds;
      }
      
      interface PlaceSearchPagination {
        hasNextPage: boolean;
        nextPage(): void;
      }
      
      type PlacesServiceStatus = "OK" | "ZERO_RESULTS" | "OVER_QUERY_LIMIT" | "REQUEST_DENIED" | "INVALID_REQUEST" | "UNKNOWN_ERROR" | "NOT_FOUND";
    }
    
    namespace geometry {
      namespace spherical {
        function computeDistanceBetween(from: LatLng | LatLngLiteral, to: LatLng | LatLngLiteral, radius?: number): number;
        function computeHeading(from: LatLng | LatLngLiteral, to: LatLng | LatLngLiteral): number;
        function computeOffset(from: LatLng | LatLngLiteral, distance: number, heading: number, radius?: number): LatLng;
      }
    }
  }
}

// This export is needed to make this a module
export {};
