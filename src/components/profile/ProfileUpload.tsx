import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const createStorageBucket = async () => {
      if (!user) return;
      
      try {
        const { data: existingBucket } = await supabase
          .storage
          .getBucket('profiles');
        
        if (!existingBucket) {
          await supabase
            .storage
            .createBucket('profiles', {
              public: true,
              fileSizeLimit: 5242880 // 5MB
            });
        }
      } catch (error) {
        console.error('Error creating bucket:', error);
      }
    };

    createStorageBucket();
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file",
      });
      return;
    }

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
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUploadProgress(100);
      onUploadSuccess(publicUrl);
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="w-24 h-24 cursor-pointer hover:opacity-90 transition-opacity" 
          onClick={() => fileInputRef.current?.click()}>
          <AvatarImage src={currentImage} />
          <AvatarFallback className="bg-primary/10">
            <Camera className="w-8 h-8 text-primary" />
          </AvatarFallback>
        </Avatar>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {isUploading && (
        <Progress value={uploadProgress} className="w-[60%]" />
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : 'Change Profile Picture'}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
