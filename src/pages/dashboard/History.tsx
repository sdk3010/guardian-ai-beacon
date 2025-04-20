
import { useState, useEffect } from 'react';
import { alerts } from '@/lib/api';

interface Alert {
  id: string;
  timestamp: string;
  type: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'triggered' | 'resolved';
}

export default function History() {
  const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await alerts.getAll();
      setAlertHistory(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load alert history');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Alert History</h1>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {alertHistory.map((alert) => (
          <div 
            key={alert.id} 
            className="p-4 border rounded-lg"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">{alert.type}</h3>
              <span className={`px-2 py-1 rounded-full text-xs ${
                alert.status === 'resolved' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {alert.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(alert.timestamp).toLocaleString()}
            </p>
            <p className="text-sm mt-2">
              Location: {alert.location.lat}, {alert.location.lng}
            </p>
          </div>
        ))}

        {alertHistory.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No alert history found
          </p>
        )}
      </div>
    </div>
  );
}
