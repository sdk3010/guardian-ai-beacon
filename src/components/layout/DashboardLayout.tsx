import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, Clock, Phone, MapPin, LogOut, Menu, X, MessageSquare } from "lucide-react";
import FloatingTrackButton from '@/components/tracking/FloatingTrackButton';
import ThemeToggle from '@/components/theme/ThemeToggle';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="md:hidden flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-primary mr-2" />
          <h1 className="font-bold text-xl">Guardian AI</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden md:flex md:w-64 flex-col border-r bg-card">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="font-bold text-xl">Guardian AI</h1>
            </div>

            {user && (
              <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-primary/5">
                <Avatar>
                  <AvatarImage src={user.profilePic} />
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{user.name}</h3>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            )}

            <nav className="space-y-1.5">
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors 
                  ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                }
                end
              >
                <Shield className="w-5 h-5" />
                Dashboard
              </NavLink>
              <NavLink 
                to="/dashboard/tracking" 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors 
                  ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                }
              >
                <MapPin className="w-5 h-5" />
                Tracking
              </NavLink>
              <NavLink 
                to="/dashboard/chat" 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors 
                  ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                }
              >
                <MessageSquare className="w-5 h-5" />
                Chat Assistant
              </NavLink>
              <NavLink 
                to="/dashboard/history" 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors 
                  ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                }
              >
                <Clock className="w-5 h-5" />
                History
              </NavLink>
              <NavLink 
                to="/dashboard/contacts" 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors 
                  ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                }
              >
                <Phone className="w-5 h-5" />
                Contacts
              </NavLink>
            </nav>
          </div>

          <div className="mt-auto p-4 border-t flex justify-between items-center">
            <Button 
              variant="ghost" 
              className="justify-start" 
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
            <ThemeToggle />
          </div>
        </aside>

        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-background">
            <div className="flex flex-col h-full pt-16 p-6">
              <div className="flex flex-col items-center space-y-4 mb-8">
                {user && (
                  <>
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user.profilePic} />
                      <AvatarFallback className="text-lg"><User /></AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <h2 className="font-bold text-xl">{user.name}</h2>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </>
                )}
              </div>

              <nav className="space-y-2">
                <NavLink 
                  to="/dashboard" 
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-lg
                    ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                  }
                  end
                >
                  <Shield className="w-5 h-5" />
                  Dashboard
                </NavLink>
                <NavLink 
                  to="/dashboard/tracking" 
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-lg
                    ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                  }
                >
                  <MapPin className="w-5 h-5" />
                  Tracking
                </NavLink>
                <NavLink 
                  to="/dashboard/chat" 
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-lg
                    ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                  }
                >
                  <MessageSquare className="w-5 h-5" />
                  Chat Assistant
                </NavLink>
                <NavLink 
                  to="/dashboard/history" 
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-lg
                    ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                  }
                >
                  <Clock className="w-5 h-5" />
                  History
                </NavLink>
                <NavLink 
                  to="/dashboard/contacts" 
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-lg
                    ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
                  }
                >
                  <Phone className="w-5 h-5" />
                  Contacts
                </NavLink>
              </nav>

              <div className="mt-auto pb-4">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2" 
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <Outlet />
          
          {location.pathname !== '/dashboard/tracking' && (
            <div className="hidden md:block">
              <FloatingTrackButton />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
