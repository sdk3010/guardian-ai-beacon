
import { useState, useEffect } from 'react';
import { alerts } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, AlertTriangle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Alert {
  id: string;
  timestamp: string;
  type: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'resolved';
  message?: string;
}

export default function History() {
  const { toast } = useToast();
  const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAlert, setIsDeletingAlert] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setError('');
    try {
      const response = await alerts.getAll();
      setAlertHistory(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load alert history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    setIsDeletingAlert(id);
    try {
      await alerts.delete(id);
      setAlertHistory(prev => prev.filter(alert => alert.id !== id));
      toast({
        title: "Alert Deleted",
        description: "Alert has been removed from your history",
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete alert');
      toast({
        variant: "destructive",
        title: "Failed to Delete",
        description: "Could not delete the alert. Please try again.",
      });
    } finally {
      setIsDeletingAlert(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'emergency':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'voice':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Alert History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading your alert history...</div>
          ) : alertHistory.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium">No Alert History</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  You haven't triggered any alerts yet. Your safety events will appear here when they occur.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {alertHistory.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`border rounded-lg overflow-hidden ${
                    alert.status === 'active' ? 'border-red-200 bg-red-50' : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                      <div className="flex items-center">
                        {getAlertTypeIcon(alert.type)}
                        <h3 className="font-medium ml-2">
                          {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert
                        </h3>
                        <span className={`ml-3 px-2 py-0.5 rounded-full text-xs ${
                          alert.status === 'resolved' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {alert.status === 'resolved' ? 'Resolved' : 'Active'}
                        </span>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 px-2 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Alert History</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this alert from your history? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteAlert(alert.id)}
                              disabled={isDeletingAlert === alert.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeletingAlert === alert.id ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        {formatDate(alert.timestamp)}
                      </p>
                      
                      {alert.message && (
                        <p className="italic">"{alert.message}"</p>
                      )}
                      
                      <p className="flex items-center text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        Location: {alert.location.lat.toFixed(6)}, {alert.location.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
