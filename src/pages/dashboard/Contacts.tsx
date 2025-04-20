
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contacts } from '@/lib/api';
import { Plus } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export default function Contacts() {
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await contacts.getAll();
      setContactsList(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactsList.length >= 10) {
      setError('Maximum 10 contacts allowed');
      return;
    }

    try {
      await contacts.add(newContact);
      await loadContacts(); // Refresh the list
      setNewContact({ name: '', phone: '', email: '' }); // Reset form
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add contact');
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Emergency Contacts</h1>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleAddContact} className="mb-8 space-y-4">
        <div className="flex gap-4">
          <Input
            placeholder="Name"
            value={newContact.name}
            onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            placeholder="Phone"
            value={newContact.phone}
            onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
            required
            type="tel"
          />
          <Input
            placeholder="Email"
            value={newContact.email}
            onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
            required
            type="email"
          />
          <Button type="submit">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {contactsList.length}/10 contacts added
        </p>
      </form>

      <div className="space-y-4">
        {contactsList.map((contact) => (
          <div 
            key={contact.id} 
            className="p-4 border rounded-lg flex justify-between items-center"
          >
            <div>
              <h3 className="font-medium">{contact.name}</h3>
              <p className="text-sm text-muted-foreground">
                {contact.phone} • {contact.email}
              </p>
            </div>
          </div>
        ))}

        {contactsList.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No emergency contacts added yet
          </p>
        )}
      </div>
    </div>
  );
}
