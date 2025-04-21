import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { Phone, Mail, User, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship?: string;
  user_id?: string;
}

export default function Contacts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;
    
    setError('');
    try {
      console.log('Fetching contacts for user ID:', user.id);
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log('Loaded contacts:', data);
      setContactsList(data || []);
    } catch (err: any) {
      console.error('Error loading contacts:', err);
      setError(err.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {
      name: '',
      phone: '',
      email: '',
    };
    let isValid = true;

    if (!newContact.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    }

    if (!newContact.phone.trim()) {
      errors.phone = 'Phone is required';
      isValid = false;
    } else if (!/^\+?[0-9\s-]{10,15}$/.test(newContact.phone.replace(/[-()\s]/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
      isValid = false;
    }

    if (!newContact.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(newContact.email)) {
      errors.email = 'Please enter a valid email';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to add contacts');
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    if (contactsList.length >= 10) {
      setError('Maximum 10 contacts allowed');
      toast({
        variant: "destructive",
        title: "Maximum Limit Reached",
        description: "You can have a maximum of 10 emergency contacts",
      });
      return;
    }

    setIsAddingContact(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert({
          name: newContact.name,
          phone: newContact.phone,
          email: newContact.email,
          relationship: newContact.relationship || null,
          user_id: user.id
        })
        .select();

      if (error) throw error;
      
      toast({
        title: "Contact Added",
        description: "Emergency contact has been added successfully",
      });
      
      await loadContacts(); // Refresh the list
      setNewContact({ name: '', phone: '', email: '', relationship: '' }); // Reset form
    } catch (err: any) {
      console.error('Error adding contact:', err);
      setError(err.message || 'Failed to add contact');
      toast({
        variant: "destructive",
        title: "Failed to Add Contact",
        description: err.message || 'An error occurred',
      });
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!user) return;
    
    setIsDeletingContact(id);
    setError('');

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await loadContacts(); // Refresh the list
      toast({
        title: "Contact Deleted",
        description: "Emergency contact has been removed",
      });
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      setError(err.message || 'Failed to delete contact');
      toast({
        variant: "destructive",
        title: "Failed to Delete Contact",
        description: err.message || 'An error occurred',
      });
    } finally {
      setIsDeletingContact(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewContact(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user types
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleRelationshipChange = (value: string) => {
    setNewContact(prev => ({ ...prev, relationship: value }));
  };

  if (!user) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">
              You need to be logged in to manage your emergency contacts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Emergency Contacts</CardTitle>
          <CardDescription>
            Add people who will be notified in case of an emergency. Maximum 10 contacts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddContact} className="mb-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    className="pl-10"
                    value={newContact.name}
                    onChange={handleChange}
                    disabled={isAddingContact}
                  />
                </div>
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Select value={newContact.relationship} onValueChange={handleRelationshipChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="coworker">Coworker</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+1 (555) 123-4567"
                    className="pl-10"
                    value={newContact.phone}
                    onChange={handleChange}
                    disabled={isAddingContact}
                    type="tel"
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-sm text-destructive">{formErrors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    placeholder="john.doe@example.com"
                    className="pl-10"
                    value={newContact.email}
                    onChange={handleChange}
                    disabled={isAddingContact}
                    type="email"
                  />
                </div>
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {contactsList.length}/10 contacts added
              </p>
              <Button 
                type="submit" 
                disabled={isAddingContact || contactsList.length >= 10}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {isAddingContact ? 'Adding Contact...' : 'Add Contact'}
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-2">Your Contacts</h3>
            
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
            ) : contactsList.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <Phone className="h-10 w-10 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No contacts yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Add emergency contacts to be notified in case of danger
                  </p>
                </div>
              </div>
            ) : (
              contactsList.map((contact) => (
                <div 
                  key={contact.id} 
                  className="p-4 border rounded-lg flex flex-wrap justify-between items-center gap-4"
                >
                  <div>
                    <h3 className="font-medium flex items-center">
                      <User className="h-4 w-4 mr-2 text-primary" />
                      {contact.name}
                      {contact.relationship && (
                        <span className="ml-2 text-xs bg-accent px-2 py-1 rounded-full">
                          {contact.relationship}
                        </span>
                      )}
                    </h3>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <p className="flex items-center">
                        <Phone className="h-3 w-3 mr-2" />
                        {contact.phone}
                      </p>
                      <p className="flex items-center">
                        <Mail className="h-3 w-3 mr-2" />
                        {contact.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteContact(contact.id)}
                    disabled={isDeletingContact === contact.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeletingContact === contact.id ? 'Deleting...' : 'Remove'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
