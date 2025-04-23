
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isToday, isYesterday, parseISO, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Eye, Filter, MapPin, MessageCircle, AlertTriangle } from 'lucide-react';

interface TrackingRecord {
  id: string;
  user_id: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  address?: string;
  status?: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_user: boolean;
  created_at: string;
}

interface AlertRecord {
  id: string;
  user_id: string;
  message?: string;
  location?: {
    lat: number;
    lng: number;
  };
  created_at: string;
  status?: string;
  type?: string;
}

type HistoryType = 'all' | 'tracking' | 'chat' | 'alerts';
type TimeFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trackingHistory, setTrackingHistory] = useState<TrackingRecord[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyType, setHistoryType] = useState<HistoryType>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 7));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch history data
  useEffect(() => {
    if (!user) return;
    
    const fetchHistory = async () => {
      setLoading(true);
      try {
        // Get date filter
        let startDate: Date | null = null;
        const now = new Date();
        
        switch (timeFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'yesterday':
            startDate = subDays(new Date(now.setHours(0, 0, 0, 0)), 1);
            break;
          case 'week':
            startDate = subDays(new Date(), 7);
            break;
          case 'month':
            startDate = subDays(new Date(), 30);
            break;
          case 'custom':
            startDate = customStartDate || null;
            break;
          default:
            startDate = null;
        }
        
        const startTimestamp = startDate ? startDate.toISOString() : null;
        const endTimestamp = timeFilter === 'custom' && customEndDate 
          ? new Date(customEndDate.setHours(23, 59, 59, 999)).toISOString() 
          : null;
        
        // Fetch tracking history
        if (historyType === 'all' || historyType === 'tracking') {
          let query = supabase
            .from('location_points')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false });
            
          if (startTimestamp) {
            query = query.gte('timestamp', startTimestamp);
          }
          
          if (endTimestamp) {
            query = query.lte('timestamp', endTimestamp);
          }
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          // Convert to TrackingRecord format
          const trackingRecords: TrackingRecord[] = (data || []).map(point => {
            // Parse location data from JSONB
            let locationData: { lat: number; lng: number } = { lat: 0, lng: 0 };
            
            try {
              if (typeof point.location === 'string') {
                locationData = JSON.parse(point.location);
              } else if (point.location && typeof point.location === 'object') {
                locationData = point.location as { lat: number; lng: number };
              }
            } catch (e) {
              console.error('Error parsing location data:', e);
            }
            
            return {
              id: point.id,
              user_id: point.user_id,
              location: locationData,
              timestamp: point.timestamp,
              address: undefined,
              status: undefined
            };
          });
          
          setTrackingHistory(trackingRecords);
        }
        
        // Fetch chat history
        if (historyType === 'all' || historyType === 'chat') {
          let query = supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (startTimestamp) {
            query = query.gte('created_at', startTimestamp);
          }
          
          if (endTimestamp) {
            query = query.lte('created_at', endTimestamp);
          }
          
          const { data, error } = await query;
          
          if (error) throw error;
          setChatHistory(data || []);
        }
        
        // Fetch alert history
        if (historyType === 'all' || historyType === 'alerts') {
          let query = supabase
            .from('alerts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (startTimestamp) {
            query = query.gte('created_at', startTimestamp);
          }
          
          if (endTimestamp) {
            query = query.lte('created_at', endTimestamp);
          }
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          // Convert to AlertRecord format
          const alertRecords: AlertRecord[] = (data || []).map(alert => ({
            id: alert.id,
            user_id: alert.user_id,
            message: alert.message,
            location: alert.latitude && alert.longitude 
              ? { lat: alert.latitude, lng: alert.longitude } 
              : undefined,
            created_at: alert.created_at,
            status: alert.status,
            type: alert.type
          }));
          
          setAlertHistory(alertRecords);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load history data."
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [user, historyType, timeFilter, customStartDate, customEndDate, toast]);

  const handleViewDetails = (item: any, type: string) => {
    setSelectedItem({ ...item, type });
    setIsDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy - h:mm a');
    }
  };

  return (
    <div className="p-4 bg-[#1A1F2C] min-h-full">
      <Card className="bg-[#232836] border-[#9b87f5]/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#9b87f5]" />
            History
          </CardTitle>
          <CardDescription className="text-[#F1F0FB]/70">
            View your past activities, chats, and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
            <div className="md:w-1/2">
              <label className="text-sm text-[#F1F0FB]/70 mb-2 block">Show:</label>
              <Select value={historyType} onValueChange={(value) => setHistoryType(value as HistoryType)}>
                <SelectTrigger className="bg-[#1A1F2C] border-[#9b87f5]/30 text-white">
                  <SelectValue placeholder="Select history type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2C] border-[#9b87f5]/30 text-white">
                  <SelectItem value="all">All History</SelectItem>
                  <SelectItem value="tracking">Tracking History</SelectItem>
                  <SelectItem value="chat">Chat History</SelectItem>
                  <SelectItem value="alerts">Alert History</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:w-1/2">
              <label className="text-sm text-[#F1F0FB]/70 mb-2 block">Time Period:</label>
              <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
                <SelectTrigger className="bg-[#1A1F2C] border-[#9b87f5]/30 text-white">
                  <SelectValue placeholder="Select time filter" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2C] border-[#9b87f5]/30 text-white">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {timeFilter === 'custom' && (
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex flex-col space-y-2">
                <label className="text-sm text-[#F1F0FB]/70">Start Date:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-[#1A1F2C] border-[#9b87f5]/30 text-white">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex flex-col space-y-2">
                <label className="text-sm text-[#F1F0FB]/70">End Date:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-[#1A1F2C] border-[#9b87f5]/30 text-white">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#9b87f5]"></div>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[#1A1F2C] text-white">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="locations">Locations</TabsTrigger>
                <TabsTrigger value="conversations">Conversations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                {trackingHistory.length === 0 && chatHistory.length === 0 && alertHistory.length === 0 ? (
                  <div className="text-center py-8 text-[#F1F0FB]/70">
                    No history found for the selected filters.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alertHistory.map(alert => (
                      <Card key={alert.id} className="bg-[#1A1F2C] border-red-500/30 text-white">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-500 mt-1" />
                              <div>
                                <div className="font-medium">
                                  {alert.type || 'Emergency'} Alert
                                </div>
                                <div className="text-sm text-[#F1F0FB]/70">
                                  {formatDate(alert.created_at)}
                                </div>
                                {alert.message && (
                                  <div className="mt-2 text-sm">{alert.message}</div>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-[#9b87f5]/30 text-[#9b87f5]"
                              onClick={() => handleViewDetails(alert, 'alert')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {trackingHistory.map(record => (
                      <Card key={record.id} className="bg-[#1A1F2C] border-[#9b87f5]/30 text-white">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-5 w-5 text-[#9b87f5] mt-1" />
                              <div>
                                <div className="font-medium">
                                  Location Tracked
                                </div>
                                <div className="text-sm text-[#F1F0FB]/70">
                                  {formatDate(record.timestamp)}
                                </div>
                                {record.address && (
                                  <div className="mt-2 text-sm">{record.address}</div>
                                )}
                                {!record.address && record.location && (
                                  <div className="mt-2 text-sm">
                                    {record.location.lat.toFixed(6)}, {record.location.lng.toFixed(6)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-[#9b87f5]/30 text-[#9b87f5]"
                              onClick={() => handleViewDetails(record, 'tracking')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {chatHistory.map(message => (
                      <Card key={message.id} className="bg-[#1A1F2C] border-[#9b87f5]/30 text-white">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-2">
                              <MessageCircle className="h-5 w-5 text-[#9b87f5] mt-1" />
                              <div>
                                <div className="font-medium">
                                  {message.is_user ? 'You' : 'AI Assistant'}
                                </div>
                                <div className="text-sm text-[#F1F0FB]/70">
                                  {formatDate(message.created_at)}
                                </div>
                                <div className="mt-2 text-sm line-clamp-2">
                                  {message.message}
                                </div>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-[#9b87f5]/30 text-[#9b87f5]"
                              onClick={() => handleViewDetails(message, 'chat')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Full
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="locations" className="mt-4">
                {trackingHistory.length === 0 && alertHistory.length === 0 ? (
                  <div className="text-center py-8 text-[#F1F0FB]/70">
                    No location history found for the selected filters.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alertHistory.filter(alert => alert.location).map(alert => (
                      <Card key={alert.id} className="bg-[#1A1F2C] border-red-500/30 text-white">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-500 mt-1" />
                              <div>
                                <div className="font-medium">
                                  Emergency Alert Location
                                </div>
                                <div className="text-sm text-[#F1F0FB]/70">
                                  {formatDate(alert.created_at)}
                                </div>
                                {alert.location && (
                                  <div className="mt-2 text-sm">
                                    {alert.location.lat.toFixed(6)}, {alert.location.lng.toFixed(6)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-[#9b87f5]/30 text-[#9b87f5]"
                              onClick={() => handleViewDetails(alert, 'alert')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {trackingHistory.map(record => (
                      <Card key={record.id} className="bg-[#1A1F2C] border-[#9b87f5]/30 text-white">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-5 w-5 text-[#9b87f5] mt-1" />
                              <div>
                                <div className="font-medium">
                                  Location Tracked
                                </div>
                                <div className="text-sm text-[#F1F0FB]/70">
                                  {formatDate(record.timestamp)}
                                </div>
                                {record.address && (
                                  <div className="mt-2 text-sm">{record.address}</div>
                                )}
                                {!record.address && record.location && (
                                  <div className="mt-2 text-sm">
                                    {record.location.lat.toFixed(6)}, {record.location.lng.toFixed(6)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-[#9b87f5]/30 text-[#9b87f5]"
                              onClick={() => handleViewDetails(record, 'tracking')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View on Map
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="conversations" className="mt-4">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8 text-[#F1F0FB]/70">
                    No conversation history found for the selected filters.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatHistory.map(message => (
                      <Card key={message.id} className="bg-[#1A1F2C] border-[#9b87f5]/30 text-white">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-2">
                              <MessageCircle className="h-5 w-5 text-[#9b87f5] mt-1" />
                              <div>
                                <div className="font-medium">
                                  {message.is_user ? 'You' : 'AI Assistant'}
                                </div>
                                <div className="text-sm text-[#F1F0FB]/70">
                                  {formatDate(message.created_at)}
                                </div>
                                <div className="mt-2 text-sm">
                                  {message.message}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="bg-[#1A1F2C] text-white border-[#9b87f5]/30">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedItem?.type === 'tracking' ? 'Location Details' : 
               selectedItem?.type === 'chat' ? 'Conversation Details' : 
               'Alert Details'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#F1F0FB]/70">
              {selectedItem?.timestamp || selectedItem?.created_at ? 
                formatDate(selectedItem?.timestamp || selectedItem?.created_at) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            {selectedItem?.type === 'tracking' && (
              <div className="space-y-4">
                {selectedItem?.address && (
                  <div>
                    <h4 className="text-sm font-medium text-[#9b87f5]">Address</h4>
                    <p className="text-[#F1F0FB]">{selectedItem.address}</p>
                  </div>
                )}
                
                {selectedItem?.location && (
                  <div>
                    <h4 className="text-sm font-medium text-[#9b87f5]">Coordinates</h4>
                    <p className="text-[#F1F0FB]">
                      Latitude: {selectedItem.location.lat.toFixed(6)}<br />
                      Longitude: {selectedItem.location.lng.toFixed(6)}
                    </p>
                  </div>
                )}
                
                {selectedItem?.status && (
                  <div>
                    <h4 className="text-sm font-medium text-[#9b87f5]">Status</h4>
                    <p className="text-[#F1F0FB]">{selectedItem.status}</p>
                  </div>
                )}
                
                <div className="h-48 md:h-64 bg-[#282c3a] rounded-md flex items-center justify-center">
                  <div className="text-[#F1F0FB]/70">Map placeholder</div>
                </div>
              </div>
            )}
            
            {selectedItem?.type === 'chat' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-[#9b87f5]">From</h4>
                  <p className="text-[#F1F0FB]">{selectedItem?.is_user ? 'You' : 'AI Assistant'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-[#9b87f5]">Message</h4>
                  <p className="text-[#F1F0FB] whitespace-pre-wrap">{selectedItem?.message}</p>
                </div>
              </div>
            )}
            
            {selectedItem?.type === 'alert' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-[#9b87f5]">Alert Type</h4>
                  <p className="text-[#F1F0FB]">{selectedItem?.type || 'Emergency'}</p>
                </div>
                
                {selectedItem?.message && (
                  <div>
                    <h4 className="text-sm font-medium text-[#9b87f5]">Message</h4>
                    <p className="text-[#F1F0FB]">{selectedItem.message}</p>
                  </div>
                )}
                
                {selectedItem?.location && (
                  <div>
                    <h4 className="text-sm font-medium text-[#9b87f5]">Location</h4>
                    <p className="text-[#F1F0FB]">
                      Latitude: {selectedItem.location.lat.toFixed(6)}<br />
                      Longitude: {selectedItem.location.lng.toFixed(6)}
                    </p>
                    
                    <div className="h-48 md:h-64 mt-4 bg-[#282c3a] rounded-md flex items-center justify-center">
                      <div className="text-[#F1F0FB]/70">Map placeholder</div>
                    </div>
                  </div>
                )}
                
                {selectedItem?.status && (
                  <div>
                    <h4 className="text-sm font-medium text-[#9b87f5]">Status</h4>
                    <p className="text-[#F1F0FB]">{selectedItem.status}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent text-[#F1F0FB] border-[#9b87f5]/30 hover:bg-[#9b87f5]/10">
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
