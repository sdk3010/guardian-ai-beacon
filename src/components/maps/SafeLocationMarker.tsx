
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { MapPin } from "lucide-react";
import type { SafeLocation } from '@/hooks/useSafeLocations';

interface SafeLocationMarkerProps {
  lat: number;
  lng: number;
  onSave: (location: Omit<SafeLocation, 'id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
}

export default function SafeLocationMarker({ lat, lng, onSave, onCancel }: SafeLocationMarkerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
    }
  });

  const onSubmit = async (data: { name: string; description: string }) => {
    try {
      await onSave({
        name: data.name,
        description: data.description,
        latitude: lat,
        longitude: lng,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  return (
    <div className="absolute z-10">
      <MapPin className="w-8 h-8 text-primary -translate-x-4 -translate-y-8" />
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Safe Location</DialogTitle>
            <DialogDescription>
              Add details for this safe location
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Home, Office, etc." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional details about this location" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsOpen(false);
                  onCancel();
                }}>
                  Cancel
                </Button>
                <Button type="submit">Save Location</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
