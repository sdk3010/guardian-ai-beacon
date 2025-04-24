
import { supabase } from '@/integrations/supabase/client';

export interface LocationPoint {
  id: string;
  session_id: string;
  user_id: string;
  location: { lat: number; lng: number };
  timestamp: string;
  accuracy?: number;
}

export interface TrackingSession {
  id: string;
  user_id: string;
  start_location?: { lat: number; lng: number };
  start_time: string;
  end_location?: { lat: number; lng: number };
  end_time?: string;
  status: 'active' | 'completed' | 'emergency';
  notes?: string;
  distance?: number;
}

export interface SafePlace {
  id: string;
  name: string;
  type: string;
  distance: number;
  address?: string;
  rating?: number;
  lat: number;
  lng: number;
}

export const TrackingService = {
  // Create a new tracking session
  async createSession(
    userId: string, 
    location: { lat: number; lng: number }
  ): Promise<TrackingSession> {
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .insert([
          { 
            user_id: userId, 
            start_location: JSON.stringify(location), 
            status: 'active'
          }
        ])
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Parse the location data from string if necessary
      const parsedData = {
        ...data,
        start_location: parseLocationData(data.start_location),
        end_location: parseLocationData(data.end_location)
      };
      
      return parsedData;
    } catch (error) {
      console.error('Error creating tracking session:', error);
      throw new Error('Failed to create tracking session');
    }
  },

  // End a tracking session
  async endSession(
    sessionId: string, 
    location: { lat: number; lng: number }
  ): Promise<TrackingSession> {
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .update({ 
          end_location: JSON.stringify(location), 
          end_time: new Date().toISOString(), 
          status: 'completed' 
        })
        .eq('id', sessionId)
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Parse the location data from string if necessary
      const parsedData = {
        ...data,
        start_location: parseLocationData(data.start_location),
        end_location: parseLocationData(data.end_location)
      };
      
      return parsedData;
    } catch (error) {
      console.error('Error ending tracking session:', error);
      throw new Error('Failed to end tracking session');
    }
  },

  // Add a location point to a tracking session
  async addLocationPoint(
    sessionId: string, 
    userId: string, 
    location: { lat: number; lng: number }, 
    accuracy?: number
  ): Promise<LocationPoint> {
    try {
      const { data, error } = await supabase
        .from('location_points')
        .insert([
          { 
            session_id: sessionId, 
            user_id: userId, 
            location: JSON.stringify(location), 
            accuracy 
          }
        ])
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Parse the location data from string if necessary
      const parsedData = {
        ...data,
        location: parseLocationData(data.location)
      };
      
      return parsedData;
    } catch (error) {
      console.error('Error adding location point:', error);
      throw new Error('Failed to add location point');
    }
  },

  // Get location points for a tracking session
  async getLocationPoints(sessionId: string): Promise<LocationPoint[]> {
    try {
      const { data, error } = await supabase
        .from('location_points')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      
      // Parse the location data for each point
      const parsedData = data.map(point => ({
        ...point,
        location: parseLocationData(point.location)
      }));
      
      return parsedData;
    } catch (error) {
      console.error('Error getting location points:', error);
      throw new Error('Failed to get location points');
    }
  },

  // Get tracking history for a user
  async getTrackingHistory(userId: string): Promise<TrackingSession[]> {
    try {
      console.log('Getting tracking history for user:', userId);
      const { data, error } = await supabase
        .from('tracking_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });
      
      if (error) {
        console.error('Error in Supabase query:', error);
        throw error;
      }
      
      console.log('Tracking sessions data:', data);
      
      // Parse the location data for each session
      const parsedData = data.map(session => ({
        ...session,
        start_location: parseLocationData(session.start_location),
        end_location: parseLocationData(session.end_location)
      }));
      
      return parsedData;
    } catch (error) {
      console.error('Error getting tracking history:', error);
      throw new Error('Failed to get tracking history');
    }
  },
  
  // Get nearby safe places
  async getSafePlaces(
    location: { lat: number; lng: number }
  ): Promise<SafePlace[]> {
    try {
      // In a real app, we would make an API call to get safe places
      // For now, we'll return mock data
      const radius = 0.01; // roughly 1 mile
      return [
        { 
          id: "place1",
          name: "Hyderabad Police Station", 
          type: "Police", 
          distance: 0.8,
          lat: location.lat + radius * Math.cos(0),
          lng: location.lng + radius * Math.sin(0)
        },
        { 
          id: "place2",
          name: "Apollo Hospital", 
          type: "Hospital", 
          distance: 1.2,
          lat: location.lat + radius * Math.cos(Math.PI/2),
          lng: location.lng + radius * Math.sin(Math.PI/2)
        },
        { 
          id: "place3",
          name: "Telangana Fire Station", 
          type: "Fire Station", 
          distance: 1.5,
          lat: location.lat + radius * Math.cos(Math.PI),
          lng: location.lng + radius * Math.sin(Math.PI)
        },
        { 
          id: "place4",
          name: "MedPlus Pharmacy", 
          type: "Pharmacy", 
          distance: 0.3,
          lat: location.lat + radius * Math.cos(3*Math.PI/2),
          lng: location.lng + radius * Math.sin(3*Math.PI/2)
        },
      ];
    } catch (error) {
      console.error('Error getting safe places:', error);
      throw new Error('Failed to get safe places');
    }
  }
};

// Helper function to parse location data from different formats
function parseLocationData(locationData: any): { lat: number; lng: number } | undefined {
  if (!locationData) return undefined;
  
  try {
    // If it's a string, try to parse it as JSON
    if (typeof locationData === 'string') {
      const parsed = JSON.parse(locationData);
      if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return { lat: parsed.lat, lng: parsed.lng };
      }
    }
    
    // If it's already an object with lat/lng
    if (typeof locationData === 'object') {
      if (locationData.lat && locationData.lng) {
        return { 
          lat: typeof locationData.lat === 'number' ? locationData.lat : parseFloat(locationData.lat), 
          lng: typeof locationData.lng === 'number' ? locationData.lng : parseFloat(locationData.lng) 
        };
      }
      
      // Handle PostgreSQL POINT type format (x,y)
      if (locationData.x && locationData.y) {
        return { lat: locationData.y, lng: locationData.x };
      }
    }
    
    console.error('Unknown location data format:', locationData);
    return undefined;
  } catch (error) {
    console.error('Error parsing location data:', error, locationData);
    return undefined;
  }
}
