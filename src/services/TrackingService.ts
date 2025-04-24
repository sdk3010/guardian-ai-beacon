
import { supabase } from '@/integrations/supabase/client';

export interface TrackingSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number } | null;
  status: 'active' | 'emergency' | 'completed';
  created_at: string | null;
  updated_at: string | null;
}

export interface LocationPoint {
  id: string;
  session_id: string;
  user_id: string;
  location: { lat: number; lng: number };
  timestamp: string;
  accuracy?: number;
}

export interface TrackingSummary {
  duration: string;
  distance: number;
  averageSpeed: number;
  safetyScore: number;
  pointsCount: number;
}

export class TrackingService {
  /**
   * Create a new tracking session
   */
  static async createSession(
    userId: string,
    startLocation: { lat: number; lng: number }
  ): Promise<TrackingSession> {
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .insert([
          {
            user_id: userId,
            start_location: startLocation,
            end_location: null,
            status: 'active'
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Convert to properly typed TrackingSession
      const session: TrackingSession = {
        ...data,
        start_location: data.start_location || startLocation,
        end_location: data.end_location || null,
        status: data.status as 'active' | 'emergency' | 'completed'
      };

      return session;
    } catch (error) {
      console.error('Error creating tracking session:', error);
      throw new Error('Could not create tracking session');
    }
  }

  /**
   * End a tracking session
   */
  static async endSession(
    sessionId: string,
    endLocation: { lat: number; lng: number }
  ): Promise<TrackingSession> {
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .update({
          status: 'completed',
          end_location: endLocation,
          end_time: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      
      // Convert to properly typed TrackingSession
      const session: TrackingSession = {
        ...data,
        start_location: data.start_location || { lat: 0, lng: 0 },
        end_location: data.end_location || endLocation,
        status: data.status as 'active' | 'emergency' | 'completed'
      };

      return session;
    } catch (error) {
      console.error('Error ending tracking session:', error);
      throw new Error('Could not end tracking session');
    }
  }

  /**
   * Add a location point to a tracking session
   */
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
            location,
            accuracy
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data as LocationPoint;
    } catch (error) {
      console.error('Error adding location point:', error);
      throw new Error('Could not add location point');
    }
  }

  /**
   * Get all tracking sessions for a user
   */
  static async getTrackingHistory(userId: string): Promise<TrackingSession[]> {
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convert each session to properly typed TrackingSession
      const sessions: TrackingSession[] = (data || []).map(session => ({
        ...session,
        start_location: session.start_location || { lat: 0, lng: 0 },
        end_location: session.end_location || null,
        status: session.status as 'active' | 'emergency' | 'completed'
      }));

      return sessions;
    } catch (error) {
      console.error('Error fetching tracking history:', error);
      throw new Error('Could not fetch tracking history');
    }
  }

  /**
   * Get all location points for a session
   */
  static async getLocationPoints(sessionId: string): Promise<LocationPoint[]> {
    try {
      const { data, error } = await supabase
        .from('location_points')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data as LocationPoint[];
    } catch (error) {
      console.error('Error fetching location points:', error);
      throw new Error('Could not fetch location points');
    }
  }

  /**
   * Generate tracking summary
   */
  static async generateSessionSummary(sessionId: string): Promise<TrackingSummary> {
    try {
      // In a real application, this would analyze the points, calculate distances,
      // speeds, and generate meaningful safety insights.

      // For now, we'll return some mock data
      return {
        duration: '45 mins',
        distance: 3.2,
        averageSpeed: 12,
        safetyScore: 92,
        pointsCount: 60
      };
    } catch (error) {
      console.error('Error generating session summary:', error);
      throw new Error('Could not generate session summary');
    }
  }
}
