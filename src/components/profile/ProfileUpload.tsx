
import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/context/AuthContext';

interface ProfileUploadProps {
  currentImage?: string;
  onUploadSuccess: (imageUrl: string) => void;
}

export default function ProfileUpload({ currentImage, onUploadSuccess }: ProfileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 100);
    return interval;
  };

  // Check if 'profiles' bucket exists, create if not
  const createProfilesBucket = async () => {
    try {
      // Call the edge function to create the bucket
      const response = await fetch('/api/create-storage-bucket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bucketName: 'profiles' }),
      });
      
      if (!response.ok) {
        console.error('Failed to create profiles bucket:', await response.text());
        // Continue anyway, as we'll try to upload and see if it works
      }
    } catch (err) {
      console.error('Error creating profiles bucket:', err);
      // Continue anyway, as we'll try to upload and see if it works
    }
  };
  
  useEffect(() => {
    createProfilesBucket();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      toast({
        variant: "destructive",
        title: "File too large",
        description: "File size must be less than 5MB",
      });
      return;
    }

    setIsUploading(true);
    setError('');
    const progressInterval = simulateProgress();

    try {
      // Upload to Supabase Storage
      if (!user) throw new Error("User not authenticated");
      
      // Try to create the bucket again just in case
      await createProfilesBucket();
      
      const fileName = `${user.id}-${Date.now()}`;
      const fileExt = file.name.split('.').pop();
      const filePath = `${fileName}.${fileExt}`;

      console.log(`Uploading file to profiles bucket: ${filePath}`);
      
      // First try public upload
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;
      console.log('Public URL:', imageUrl);

      try {
        // Check if user exists first
        const { data: userData, error: userCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
          
        if (userCheckError) throw userCheckError;
        
        // If user exists, update profile image
        if (userData) {
          console.log('Updating existing user profile with new image URL');
          const { error: updateError } = await supabase
            .from('users')
            .update({ profile_image_url: imageUrl })
            .eq('id', user.id);

          if (updateError) throw updateError;
        } else {
          // If user doesn't exist, insert new user record
          console.log('User not found in database, creating new user record');
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || 'User',
              profile_image_url: imageUrl,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) throw insertError;
        }
      } catch (dbError: any) {
        console.error("Error updating user profile:", dbError);
        // Continue with success even if DB update fails
        // The image was still uploaded successfully
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        onUploadSuccess(imageUrl);
        toast({
          title: "Success",
          description: "Profile picture updated successfully",
        });
        setUploadProgress(0);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      const errorMessage = err.message || 'Failed to upload image';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: errorMessage,
      });
      console.error("Profile upload error:", err);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="w-24 h-24 cursor-pointer border-2 border-primary/20 group-hover:border-primary/50 transition-all duration-200" 
          onClick={() => fileInputRef.current?.click()}>
          <AvatarImage src={currentImage} />
          <AvatarFallback className="bg-primary/10">
            <Camera className="w-8 h-8 text-primary" />
          </AvatarFallback>
        </Avatar>
        
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Upload className="w-8 h-8 text-white" />
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {isUploading && (
        <div className="w-full space-y-2">
          <Progress value={uploadProgress} className="h-2 w-48" />
          <p className="text-xs text-center text-muted-foreground">Uploading... {uploadProgress}%</p>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2"
      >
        <Camera className="w-4 h-4" />
        {isUploading ? 'Uploading...' : 'Change Profile Picture'}
      </Button>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
