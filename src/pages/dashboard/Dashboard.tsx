
import { useState, useEffect } from 'react';
import { users } from '@/lib/api';
import ProfileUpload from '@/components/profile/ProfileUpload';
import FloatingTrackButton from '@/components/tracking/FloatingTrackButton';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  profilePic?: string;
  activeAlerts: number;
  totalAlerts: number;
}

export default function Dashboard() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const response = await users.getInfo();
      setUserInfo(response.data);
      // Update localStorage for sidebar
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load user information');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  if (!userInfo) return (
    <div className="p-6">
      <div className="bg-red-50 text-red-500 p-3 rounded-md">
        {error || 'Failed to load user information'}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Section */}
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-bold mb-4">Profile</h2>
          <ProfileUpload 
            currentImage={userInfo.profilePic}
            onUploadSuccess={(imageUrl) => {
              setUserInfo(prev => prev ? ({
                ...prev,
                profilePic: imageUrl
              }) : null);
            }}
          />
          <div className="mt-4 text-center">
            <h3 className="font-medium">{userInfo.name}</h3>
            <p className="text-sm text-muted-foreground">{userInfo.email}</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-bold mb-4">Activity Overview</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-accent rounded-lg">
              <span>Active Alerts</span>
              <span className="font-bold text-xl">{userInfo.activeAlerts}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-accent rounded-lg">
              <span>Total Alerts</span>
              <span className="font-bold text-xl">{userInfo.totalAlerts}</span>
            </div>
          </div>
        </div>
      </div>

      <FloatingTrackButton />
    </div>
  );
}
