
// This file allows TypeScript to recognize the Google Maps API types
declare global {
  interface Window {
    initGoogleMaps: () => void;
    google: typeof google;
  }
}

export {};
