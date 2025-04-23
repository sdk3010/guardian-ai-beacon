import { supabase } from '@/integrations/supabase/client';

export interface TrackingSession {
  id: string;
  user_id: string;
  start_location: { lat: number; lng: number };
  end_location?: { lat: number; lng: number };
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export interface LocationPoint {
  id: string;
  session_id: string;
  user_id: string;
  location: { lat: number; lng: number };
  accuracy?: number;
  timestamp: string;
  created_at?: string;
}

export class TrackingService {
  static async createSession(userId: string, startLocation: { lat: number; lng: number }): Promise<TrackingSession> {
    const { data, error } = await supabase
      .from('tracking_sessions')
      .insert({
        user_id: userId,
        start_location: startLocation,
        start_time: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Convert from database format to our TypeScript interface
    return this.convertDbSessionToTrackingSession(data);
  }

  static async endSession(sessionId: string, endLocation: { lat: number; lng: number }): Promise<TrackingSession> {
    const { data, error } = await supabase
      .from('tracking_sessions')
      .update({
        end_location: endLocation,
        end_time: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    
    // Convert from database format to our TypeScript interface
    return this.convertDbSessionToTrackingSession(data);
  }

  static async addLocationPoint(
    sessionId: string, 
    userId: string, 
    location: { lat: number; lng: number }, 
    accuracy?: number
  ): Promise<LocationPoint> {
    const { data, error } = await supabase
      .from('location_points')
      .insert({
        session_id: sessionId,
        user_id: userId,
        location,
        accuracy,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    
    // Convert from database format to our TypeScript interface
    return this.convertDbPointToLocationPoint(data);
  }

  static async getTrackingHistory(userId: string): Promise<TrackingSession[]> {
    const { data, error } = await supabase
      .from('tracking_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Convert from database format to our TypeScript interface
    return (data || []).map(session => this.convertDbSessionToTrackingSession(session));
  }

  static async getLocationPoints(sessionId: string): Promise<LocationPoint[]> {
    const { data, error } = await supabase
      .from('location_points')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    
    // Convert from database format to our TypeScript interface
    return (data || []).map(point => this.convertDbPointToLocationPoint(point));
  }
  
  // Helper method to convert database objects to TypeScript interface
  private static convertDbSessionToTrackingSession(dbSession: any): TrackingSession {
    // Handle different location formats - it might be a string that needs parsing,
    // or it might already be parsed as an object
    let startLocation: { lat: number; lng: number };
    let endLocation: { lat: number; lng: number } | undefined = undefined;
    
    try {
      // Parse start_location based on its current format
      if (typeof dbSession.start_location === 'string') {
        // Check if it's a PostgreSQL POINT type
        if (dbSession.start_location.startsWith('POINT')) {
          const matches = dbSession.start_location.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (matches && matches.length === 3) {
            startLocation = {
              lng: parseFloat(matches[1]),
              lat: parseFloat(matches[2])
            };
          } else {
            // If we can't parse it, default to empty coords
            startLocation = { lat: 0, lng: 0 };
          }
        } else {
          // Otherwise try to parse as JSON
          startLocation = JSON.parse(dbSession.start_location);
        }
      } else {
        startLocation = dbSession.start_location;
      }
      
      // Try to parse end_location if it exists
      if (dbSession.end_location) {
        if (typeof dbSession.end_location === 'string') {
          // Check if it's a PostgreSQL POINT type
          if (dbSession.end_location.startsWith('POINT')) {
            const matches = dbSession.end_location.match(/POINT\(([^ ]+) ([^)]+)\)/);
            if (matches && matches.length === 3) {
              endLocation = {
                lng: parseFloat(matches[1]),
                lat: parseFloat(matches[2])
              };
            }
          } else {
            // Otherwise try to parse as JSON
            endLocation = JSON.parse(dbSession.end_location);
          }
        } else {
          endLocation = dbSession.end_location;
        }
      }
    } catch (e) {
      console.error('Error parsing location data:', e);
      // Fallback to a default location if parsing fails
      startLocation = { lat: 0, lng: 0 };
    }
    
    return {
      id: dbSession.id,
      user_id: dbSession.user_id,
      start_location: startLocation,
      end_location: endLocation,
      start_time: dbSession.start_time,
      end_time: dbSession.end_time,
      status: dbSession.status as 'active' | 'completed',
      created_at: dbSession.created_at,
      updated_at: dbSession.updated_at
    };
  }
  
  // Helper method to convert database objects to TypeScript interface
  private static convertDbPointToLocationPoint(dbPoint: any): LocationPoint {
    let locationData: { lat: number; lng: number };
    
    try {
      // Try to parse location based on its format
      if (typeof dbPoint.location === 'string') {
        // Check if it's a PostgreSQL POINT type
        if (dbPoint.location.startsWith('POINT')) {
          const matches = dbPoint.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (matches && matches.length === 3) {
            locationData = {
              lng: parseFloat(matches[1]),
              lat: parseFloat(matches[2])
            };
          } else {
            // If we can't parse it, default to empty coords
            locationData = { lat: 0, lng: 0 };
          }
        } else {
          // Otherwise try to parse as JSON
          locationData = JSON.parse(dbPoint.location);
        }
      } else {
        locationData = dbPoint.location;
      }
    } catch (e) {
      console.error('Error parsing location data:', e);
      // Fallback to a default location if parsing fails
      locationData = { lat: 0, lng: 0 };
    }
    
    return {
      id: dbPoint.id,
      session_id: dbPoint.session_id,
      user_id: dbPoint.user_id,
      location: locationData,
      accuracy: dbPoint.accuracy,
      timestamp: dbPoint.timestamp,
      created_at: dbPoint.created_at
    };
  }
}
