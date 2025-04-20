
import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { users } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";

interface ProfileUploadProps {
  currentImage?: string;
  onUploadSuccess: (imageUrl: string) => void;
}

export default function ProfileUpload({ currentImage, onUploadSuccess }: ProfileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

    try {
      const response = await users.uploadProfilePic(file);
      onUploadSuccess(response.data.imageUrl);
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to upload image';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="w-24 h-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <AvatarImage src={currentImage} />
        <AvatarFallback>
          <Camera className="w-8 h-8" />
        </AvatarFallback>
      </Avatar>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : 'Change Profile Picture'}
      </Button>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
