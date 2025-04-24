
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SafeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  contact_id?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  radius: number;
}

export function useSafeLocations() {
  const [safeLocations, setSafeLocations] = useState<SafeLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadSafeLocations();
    }
  }, [user]);

  const loadSafeLocations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('safe_zones')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setSafeLocations(data || []);
    } catch (error: any) {
      console.error('Error loading safe locations:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load safe locations",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addSafeLocation = async (location: Omit<SafeLocation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('safe_zones')
        .insert([
          {
            ...location,
            user_id: user?.id,
            // Default radius if not provided
            radius: location.radius || 200 // Default 200 meters radius
          }
        ])
        .select()
        .single();

      if (error) throw error;
      setSafeLocations([...safeLocations, data]);
      return data;
    } catch (error: any) {
      console.error('Error adding safe location:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add safe location",
      });
      throw error;
    }
  };

  return {
    safeLocations,
    isLoading,
    addSafeLocation,
    loadSafeLocations
  };
}
