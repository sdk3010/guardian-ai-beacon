
// This file allows TypeScript to recognize the Google Maps API types
/// <reference types="google.maps" />

declare namespace google.maps {
  // Add any additional type declarations if needed
}

declare global {
  interface Window {
    initGoogleMaps: () => void;
    google: typeof google;
  }
}

export {};
