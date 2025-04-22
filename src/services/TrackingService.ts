
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
    return {
      id: dbSession.id,
      user_id: dbSession.user_id,
      start_location: typeof dbSession.start_location === 'string' 
        ? JSON.parse(dbSession.start_location) 
        : dbSession.start_location,
      end_location: dbSession.end_location 
        ? (typeof dbSession.end_location === 'string' 
          ? JSON.parse(dbSession.end_location) 
          : dbSession.end_location) 
        : undefined,
      start_time: dbSession.start_time,
      end_time: dbSession.end_time,
      status: dbSession.status,
      created_at: dbSession.created_at,
      updated_at: dbSession.updated_at
    };
  }
  
  // Helper method to convert database objects to TypeScript interface
  private static convertDbPointToLocationPoint(dbPoint: any): LocationPoint {
    return {
      id: dbPoint.id,
      session_id: dbPoint.session_id,
      user_id: dbPoint.user_id,
      location: typeof dbPoint.location === 'string' 
        ? JSON.parse(dbPoint.location)
        : dbPoint.location,
      accuracy: dbPoint.accuracy,
      timestamp: dbPoint.timestamp,
      created_at: dbPoint.created_at
    };
  }
}
