
import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload } from "lucide-react";
import { users } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

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
      const response = await users.uploadProfilePic(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        onUploadSuccess(response.data.imageUrl);
        toast({
          title: "Success",
          description: "Profile picture updated successfully",
        });
        setUploadProgress(0);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      const errorMessage = err.response?.data?.message || 'Failed to upload image';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: errorMessage,
      });
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
