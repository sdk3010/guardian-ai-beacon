import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import ProfileUpload from '@/components/profile/ProfileUpload';
import { MapPin, Clock, Phone, Shield, ArrowRight, AlertTriangle, Plus } from "lucide-react";
import EmergencyButton from '@/components/safety/EmergencyButton';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SafeLocationsSetup from '@/components/onboarding/SafeLocationsSetup';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  profilePic?: string;
  activeAlerts: number;
  totalAlerts: number;
  lastLogin?: string;
  phone?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showManualSetup, setShowManualSetup] = useState(false);

  useEffect(() => {
    if (user) {
      ensureUserExists().then(() => loadUserInfo());
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const ensureUserExists = async () => {
    if (!user) return;
    
    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (fetchError || !userData) {
        console.log('User record not found, creating...');
        
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('Error creating user record:', insertError);
        }
      }
    } catch (err) {
      console.error('Error ensuring user exists:', err);
    }
  };

  const loadUserInfo = async () => {
    if (!user) return;

    try {
      console.log('Loading user info for:', user.id);
      
      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts')
        .select('id, status')
        .eq('user_id', user.id);
      
      if (alertsError) {
        console.error('Error fetching alerts:', alertsError);
        toast({
          variant: "destructive",
          title: "Error loading alerts",
          description: alertsError.message || "Could not load your alerts"
        });
      }
      
      const activeAlerts = alertsData?.filter(alert => alert.status === 'active').length || 0;
      const totalAlerts = alertsData?.length || 0;
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        toast({
          variant: "destructive",
          title: "Error loading profile",
          description: userError.message || "Could not load your profile data"
        });
      }
      
      if (userData) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('Error updating last login:', updateError);
        }
      }
      
      setUserInfo({
        id: user.id,
        name: userData?.name || user.user_metadata?.name || 'User',
        email: user.email || '',
        profilePic: userData?.profile_image_url,
        activeAlerts,
        totalAlerts,
        lastLogin: userData?.last_login || new Date().toISOString(),
        phone: userData?.phone
      });
    } catch (err: any) {
      console.error('Error loading user info:', err);
      setError(err.message || 'Failed to load user information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (imageUrl: string) => {
    try {
      if (user && imageUrl) {
        // Update the profile image in the database
        const { error } = await supabase
          .from('users')
          .update({ profile_image_url: imageUrl })
          .eq('id', user.id);

        if (error) throw error;

        // Update local state
        setUserInfo(prev => prev ? ({
          ...prev,
          profilePic: imageUrl
        }) : null);

        toast({
          title: "Success",
          description: "Profile picture updated successfully",
        });
      }
    } catch (err: any) {
      console.error('Error updating profile image:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile picture",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!user) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">
              You need to be logged in to access your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex justify-center items-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="animate-pulse rounded-full bg-primary/10 h-12 w-12 mx-auto flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>
            {error || 'Failed to load user information. Please try logging in again.'}
          </AlertDescription>
        </Alert>
        <div className="mt-6 text-center">
          <Button onClick={() => navigate('/login')}>Back to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <SafeLocationsSetup />
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <Shield className="mr-2 h-6 w-6 text-primary" />
        Welcome to Guardian AI
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileUpload 
              currentImage={userInfo?.profilePic}
              onUploadSuccess={handleProfileUpdate}
            />
            <div className="mt-6 text-center space-y-1">
              <h3 className="font-medium text-lg">{userInfo?.name}</h3>
              <p className="text-sm text-muted-foreground">{userInfo?.email}</p>
              {userInfo?.phone && (
                <p className="text-sm text-muted-foreground">{userInfo.phone}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Last login: {formatDate(userInfo?.lastLogin)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Safety Overview</CardTitle>
            <CardDescription>
              Your safety status and recent activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-primary/5 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Active Alerts</h3>
                  <p className="text-2xl font-bold">{userInfo?.activeAlerts}</p>
                </div>
                <div className={`rounded-full p-3 ${userInfo?.activeAlerts > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  <AlertDescription className={`h-5 w-5 ${userInfo?.activeAlerts > 0 ? 'text-red-500' : 'text-green-500'}`} />
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Total Alerts</h3>
                  <p className="text-2xl font-bold">{userInfo?.totalAlerts}</p>
                </div>
                <div className="rounded-full p-3 bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Quick Actions</h3>
                <SafeLocationsSetup />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => navigate('/dashboard/tracking')}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Start Tracking
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => setShowManualSetup(true)}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Manage Safe Locations
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => navigate('/dashboard/contacts')}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Manage Contacts
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => navigate('/dashboard/history')}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  View History
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <EmergencyButton className="w-full mt-4" />
          </CardFooter>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Safety Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-green-700 mb-2">Stay Connected</h3>
                <p className="text-sm text-green-600">
                  Keep your phone charged and share your location with trusted contacts when traveling to unfamiliar areas.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-700 mb-2">Be Aware</h3>
                <p className="text-sm text-blue-600">
                  Stay alert and aware of your surroundings. Avoid using headphones or devices that limit your awareness.
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-purple-700 mb-2">Trust Your Instincts</h3>
                <p className="text-sm text-purple-600">
                  If something feels wrong, it probably is. Don't hesitate to seek help or leave an uncomfortable situation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
