
import { supabase } from '@/integrations/supabase/client';

export interface TrackingSession {
  id: string;
  user_id: string;
  start_location: { lat: number; lng: number };
  end_location?: { lat: number; lng: number };
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed';
}

export interface LocationPoint {
  id: string;
  session_id: string;
  user_id: string;
  location: { lat: number; lng: number };
  accuracy?: number;
  timestamp: string;
}

export class TrackingService {
  static async createSession(userId: string, startLocation: { lat: number; lng: number }) {
    const { data, error } = await supabase
      .from('tracking_sessions')
      .insert({
        user_id: userId,
        start_location: startLocation,
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async endSession(sessionId: string, endLocation: { lat: number; lng: number }) {
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
    return data;
  }

  static async addLocationPoint(sessionId: string, userId: string, location: { lat: number; lng: number }, accuracy?: number) {
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
    return data;
  }

  static async getTrackingHistory(userId: string) {
    const { data, error } = await supabase
      .from('tracking_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getLocationPoints(sessionId: string) {
    const { data, error } = await supabase
      .from('location_points')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data;
  }
}
