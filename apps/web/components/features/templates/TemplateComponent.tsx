"use client";

import { useTemplateUpload } from '@/hooks/useTemplateUpload';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';

export default function TemplateComponent() {
  const { data: session } = useSession();
  const router = useRouter();
  const { uploadTemplate, isUploading, uploadProgress, error, clearError } = useTemplateUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("General");

  const fetchOrganizations = async () => {
    try {
      setLoadingOrgs(true);      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/v1/organization`, {
        headers: {
          'Authorization': `Bearer ${session?.user?.token}`
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();        
        if (data.success && data.data) {
          setOrganizations(data.data);
          // Auto-select first organization
          if (data.data.length > 0) {
            setSelectedOrgId(data.data[0].id);
            console.log('🏢 Selected organization:', data.data[0].name, data.data[0].id);
          }
        }
      } else {
        console.error('❌ Failed to fetch organizations:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error fetching organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  // Fetch organizations on mount
  useEffect(() => {
    if (session?.user?.token) {
      fetchOrganizations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.token]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file) return;
    
    setSelectedFile(file);
    setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
    clearError();
    setUploadResult(null);
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    if (!session?.user?.token) {
      alert('Please login first');
      return;
    }

    if (!selectedOrgId) {
      alert('Please select an organization first');
      return;
    }

    if (!templateName.trim()) {
      alert("Please provide a template name");
      return;
    }

    try {
      console.log('🚀 Starting upload test...');
      
      const result = await uploadTemplate(selectedFile, {
        name: templateName,
        description: templateDescription || 'Template uploaded successfully',
        category: templateCategory,
        organizationId: selectedOrgId,
      });

      console.log('✅ Upload successful!', result);
      setUploadResult(result);
      
      // Reset form
      setShowUploadDialog(false);
      setSelectedFile(null);
      setTemplateName("");
      setTemplateDescription("");
      setTemplateCategory("General");
      
      // Show success message and redirect to PDF editor
      const shouldEdit = window.confirm(
        '✅ Upload successful!\n\nWould you like to edit this PDF now?'
      );
      
      if (shouldEdit && result.id) {
        // Redirect to PDF editor
        router.push(`/dashboard/pdf-editor/${result.id}`);
      }
    } catch (err) {
      console.error('❌ Upload failed:', err);
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCancelUpload = () => {
    setShowUploadDialog(false);
    setSelectedFile(null);
    setTemplateName("");
    setTemplateDescription("");
    setTemplateCategory("General");
    clearError();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  if (!session) {
    return (
      <div className="flex-1 overflow-auto bg-gray-50 w-full p-8">
        <div className="max-w-md mx-auto p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-center">Please login to access templates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 w-full">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
              Templates
            </h1>
            <p className="text-gray-500 text-xs">
              Upload and manage your document templates
            </p>
          </div>
          
          {/* Organization Selector */}
          <div className="flex items-center gap-3">
            {loadingOrgs ? (
              <div className="text-sm text-gray-500">Loading organizations...</div>
            ) : organizations.length > 0 ? (
              <div className="flex items-center gap-2">
                <label htmlFor="org-select" className="text-sm text-gray-600 font-medium">
                  Organization:
                </label>
                <select
                  id="org-select"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-sm text-yellow-600">No organization found</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 sm:p-4 lg:p-8">

        {/* Upload Area */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12">
          <div className="max-w-2xl mx-auto">
            <div
              className={`border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-gray-50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-gray-100 rounded-full">
                  <Upload className="h-12 w-12 text-gray-400" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Upload Template
                  </h3>
                  <p className="text-sm text-gray-500 mb-1">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports PDF and images (max 5MB)
                  </p>
                </div>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-2 bg-[rgb(132,42,59)] hover:bg-[rgb(139,42,52)] text-white font-medium py-2.5 px-6 rounded-lg transition text-sm">
                    <Upload className="h-4 w-4" />
                    Choose File
                  </span>
                </label>

                <div className="flex items-center gap-4 text-xs text-gray-500 pt-4">
                  <div className="flex items-center gap-1">
                    <span className="text-green-600">✓</span>
                    <span>Secure Upload</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-green-600">✓</span>
                    <span>Cloud Storage</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-green-600">✓</span>
                    <span>Progress Tracking</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium mb-3">✅ Upload Successful!</p>
                <div className="space-y-2 text-sm text-green-700">
                  <p><strong>ID:</strong> {uploadResult.id}</p>
                  <p><strong>Name:</strong> {uploadResult.name}</p>
                  <p><strong>Size:</strong> {(uploadResult.size / 1024).toFixed(2)} KB</p>
                  <p><strong>Category:</strong> {uploadResult.category}</p>
                  <a 
                    href={uploadResult.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-blue-600 hover:underline font-medium"
                  >
                    View in S3 →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Template
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization <span className="text-red-500">*</span>
                </label>
                {loadingOrgs ? (
                  <div className="text-sm text-gray-500 py-2">Loading organizations...</div>
                ) : organizations.length === 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      No organizations found. Please create one first.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent"
                    disabled={isUploading}
                  >
                    <option value="">Select an organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File
                </label>
                <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedFile && `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent"
                  placeholder="Enter template name"
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent resize-none"
                  placeholder="Enter description (optional)"
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent"
                  disabled={isUploading}
                >
                  <option value="General">General</option>
                  <option value="Finance">Finance</option>
                  <option value="Legal">Legal</option>
                  <option value="HR">HR</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              {uploadProgress && (
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Uploading...</span>
                    <span>{uploadProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[rgb(132,42,59)] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleCancelUpload}
                disabled={isUploading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || !templateName.trim() || !selectedOrgId || loadingOrgs}
                className="flex-1 px-4 py-2 bg-[rgb(132,42,59)] hover:bg-[rgb(139,42,52)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
