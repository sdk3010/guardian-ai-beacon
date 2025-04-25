import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface LocationPoint {
  id: string;
  user_id: string;
  session_id: string;
  location: { lat: number; lng: number };
  timestamp: string;
  accuracy: number;
  created_at: string;
}

export interface TrackingSession {
  id: string;
  user_id: string;
  status: 'active' | 'completed' | 'emergency';
  start_time: string;
  end_time: string | null;
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number } | null;
  created_at: string | null;
  updated_at: string | null;
}

const parseLocation = (location: Json | { lat: number; lng: number }): { lat: number; lng: number } => {
  if (location === null || location === undefined) {
    return { lat: 0, lng: 0 };
  }
  
  if (typeof location === 'object' && 'lat' in location && 'lng' in location) {
    return { 
      lat: Number(location.lat),
      lng: Number(location.lng)
    };
  }
  
  if (typeof location === 'string') {
    try {
      const parsed = JSON.parse(location);
      if (parsed && typeof parsed === 'object' && 'lat' in parsed && 'lng' in parsed) {
        return { 
          lat: Number(parsed.lat), 
          lng: Number(parsed.lng) 
        };
      }
    } catch (e) {
      console.error('Error parsing location JSON:', e);
    }
  }
  
  if (typeof location === 'object') {
    const loc = location as any;
    if (loc.lat !== undefined && loc.lng !== undefined) {
      return { 
        lat: Number(loc.lat), 
        lng: Number(loc.lng) 
      };
    }
  }
  
  console.error('Invalid location format:', location);
  return { lat: 0, lng: 0 }; // Default fallback
};

export class TrackingService {
  static async createSession(userId: string, startLocation: { lat: number; lng: number }): Promise<TrackingSession> {
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .insert([
          {
            user_id: userId,
            start_location: startLocation,
            status: 'active' as const
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        status: data.status as 'active' | 'completed' | 'emergency',
        start_location: parseLocation(data.start_location),
        end_location: data.end_location ? parseLocation(data.end_location) : null
      };
    } catch (error) {
      console.error('Error creating tracking session:', error);
      throw error;
    }
  }
  
  static async endSession(sessionId: string, endLocation: { lat: number; lng: number }): Promise<TrackingSession> {
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .update({
          status: 'completed',
          end_location: endLocation,
          end_time: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        status: data.status as 'active' | 'completed' | 'emergency',
        start_location: parseLocation(data.start_location),
        end_location: data.end_location ? parseLocation(data.end_location) : null
      };
    } catch (error) {
      console.error('Error ending tracking session:', error);
      throw error;
    }
  }
  
  static async addLocationPoint(
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
            location: location,
            accuracy: accuracy || 0
          }
        ])
        .select()
        .single();
      
      if (error) throw error;

      return {
        ...data,
        location: parseLocation(data.location)
      } as LocationPoint;
    } catch (error) {
      console.error('Error adding location point:', error);
      throw error;
    }
  }
  
  static async getTrackingHistory(userId: string): Promise<TrackingSession[]> {
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(session => ({
        ...session,
        status: session.status as 'active' | 'completed' | 'emergency',
        start_location: session.start_location ? parseLocation(session.start_location) : { lat: 0, lng: 0 },
        end_location: session.end_location ? parseLocation(session.end_location) : null
      }));
    } catch (error) {
      console.error('Error getting tracking history:', error);
      throw error;
    }
  }
  
  static async getLocationPoints(sessionId: string): Promise<LocationPoint[]> {
    try {
      const { data, error } = await supabase
        .from('location_points')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(point => ({
        ...point,
        location: parseLocation(point.location)
      })) as LocationPoint[];
    } catch (error) {
      console.error('Error getting location points:', error);
      throw error;
    }
  }
  
  private mapSessionResponse(data: any): TrackingSession {
    return {
      id: data.id,
      user_id: data.user_id,
      status: data.status as 'active' | 'completed' | 'emergency',
      start_time: data.start_time,
      end_time: data.end_time,
      start_location: data.start_location,
      end_location: data.end_location,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}
