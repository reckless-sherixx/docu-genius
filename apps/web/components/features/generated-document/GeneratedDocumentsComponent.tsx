"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { 
  FileText, 
  Download, 
  Trash2, 
  Loader2, 
  FolderOpen,
  Calendar,
  User
} from "lucide-react";
import { toast } from "sonner";

interface GeneratedDocument {
  id: string;
  generated_document_url: string;
  template_id: string;
  generated_by: string;
  organization_id: string;
  created_at: string;
  template: {
    id: string;
    template_name: string;
    category: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function GeneratedDocumentsComponents() {
  const { data: session } = useSession();
  const organizationId = useOrganizationId();
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!session?.user?.token || !organizationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${backendUrl}/api/generated-documents/${organizationId}`,
          {
            headers: {
              Authorization: `Bearer ${session.user.token}`,
            },
            cache: "no-store",
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setDocuments(data.data || []);
          }
        } else {
          const errorData = await response.json();
          setError(errorData.message || "Failed to fetch documents");
        }
      } catch (err) {
        console.error("Error fetching generated documents:", err);
        setError("Failed to load documents");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [session, organizationId]);

  const handleDownload = (url: string, templateName: string) => {
    window.open(url, "_blank");
    toast.success(`Downloading ${templateName}`);
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      setDeletingId(documentId);

      const response = await fetch(
        `${backendUrl}/api/generated-documents/${documentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session?.user?.token}`,
          },
        }
      );

      if (response.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
        toast.success("Document deleted successfully");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete document");
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      toast.error("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[rgb(132,42,59)] mx-auto mb-3" />
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading documents</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FolderOpen className="h-16 w-16 mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-700">No documents generated yet</h3>
        <p className="text-sm mt-1">
          Generated documents will appear here when creators generate them from templates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Generated Documents</h2>
        <span className="text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            {/* Card Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[rgb(132,42,59)]/10 rounded-lg">
                  <FileText className="h-5 w-5 text-[rgb(132,42,59)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">
                    {doc.template?.template_name || "Untitled Document"}
                  </h3>
                  {doc.template?.category && (
                    <span className="inline-block px-2 py-0.5 mt-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {doc.template.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4 text-gray-400" />
                <span className="truncate">{doc.user?.name || doc.user?.email || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDate(doc.created_at)}</span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => handleDownload(doc.generated_document_url, doc.template?.template_name)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[rgb(132,42,59)] text-white text-sm font-medium rounded-lg hover:bg-[rgb(112,32,49)] transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete document"
              >
                {deletingId === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}