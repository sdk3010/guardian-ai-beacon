
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Home, Clock, Phone, Map, LogOut } from "lucide-react";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-border">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Avatar>
              <AvatarImage src={user.profilePic} />
              <AvatarFallback><User /></AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <nav className="space-y-2">
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-2 rounded-md transition-colors 
                ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
              }
              end
            >
              <Home className="w-5 h-5" />
              Dashboard
            </NavLink>
            <NavLink 
              to="/dashboard/tracking" 
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-2 rounded-md transition-colors 
                ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
              }
            >
              <Map className="w-5 h-5" />
              Tracking
            </NavLink>
            <NavLink 
              to="/dashboard/history" 
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-2 rounded-md transition-colors 
                ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
              }
            >
              <Clock className="w-5 h-5" />
              History
            </NavLink>
            <NavLink 
              to="/dashboard/contacts" 
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-2 rounded-md transition-colors 
                ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`
              }
            >
              <Phone className="w-5 h-5" />
              Contacts
            </NavLink>
          </nav>
        </div>

        <div className="absolute bottom-0 w-64 p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
