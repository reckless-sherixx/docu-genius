import { useState } from 'react';
import { useSession } from 'next-auth/react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

interface UploadTemplateData {
  name: string;
  description?: string;
  category?: string;
  organizationId: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseTemplateUploadReturn {
  uploadTemplate: (file: File, data: UploadTemplateData) => Promise<any>;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  error: string | null;
  clearError: () => void;
}

export const useTemplateUpload = (): UseTemplateUploadReturn => {
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must not exceed 5MB';
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Only PDF and image files (JPEG, PNG, GIF, WebP) are allowed';
    }

    return null;
  };

  const uploadTemplate = async (
    file: File,
    data: UploadTemplateData
  ): Promise<any> => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress({ loaded: 0, total: 100, percentage: 0 });

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      console.log('📤 Starting upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        templateData: data
      });

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', data.name);
      formData.append('organizationId', data.organizationId);
      
      if (data.description) {
        formData.append('description', data.description);
      }
      
      if (data.category) {
        formData.append('category', data.category);
      }

      // Upload using XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          console.log(`⬆️ Upload progress: ${percentComplete}%`);
          setUploadProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: percentComplete,
          });
        }
      });

      // Upload to backend
      const result = await new Promise<any>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          console.log('📥 Server response:', xhr.status, xhr.responseText);
          
          if (xhr.status === 201) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('✅ Upload successful:', response.data);
              resolve(response.data);
            } catch (parseError) {
              console.error('❌ Failed to parse response:', parseError);
              reject(new Error('Invalid server response'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              console.error('❌ Upload failed:', error);
              reject(new Error(error.message || 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          console.error('❌ Network error during upload');
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          console.warn('⚠️ Upload cancelled');
          reject(new Error('Upload cancelled'));
        });

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        console.log('🔗 Uploading to:', `${backendUrl}/api/templates/upload`);
        
        xhr.open('POST', `${backendUrl}/api/templates/upload`);
        
        // Add auth token from session
        const token = session?.user?.token;
        if (token) {
          console.log('🔐 Adding auth token');
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        } else {
          console.warn('⚠️ No auth token found - upload may fail');
        }
        
        xhr.send(formData);
      });

      setUploadProgress({ loaded: 100, total: 100, percentage: 100 });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      console.error('❌ Upload error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
      // Reset progress after a delay
      setTimeout(() => setUploadProgress(null), 2000);
    }
  };

  return {
    uploadTemplate,
    isUploading,
    uploadProgress,
    error,
    clearError,
  };
};
