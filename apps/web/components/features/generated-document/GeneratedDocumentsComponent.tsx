"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { 
  FileText, 
  Download, 
  Trash2, 
  Loader2, 
  FolderOpen,
  Search,
  X
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
  const { data: session, status } = useSession();
  const organizationId = useOrganizationId();
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  // list-only view
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const hasFetched = useRef(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  const token = session?.user?.token;

  const categories = ["All", ...Array.from(new Set(documents.map(d => d.template?.category || "General")))];

  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.template?.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || doc.template?.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return (a.template?.template_name || "").localeCompare(b.template?.template_name || "");
    });

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!token || !organizationId || status === "loading") {
        if (status !== "loading") setLoading(false);
        return;
      }

      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${backendUrl}/api/generated-documents/${organizationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
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
  }, [token, organizationId, status, backendUrl]);

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
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[rgb(132,42,59)] mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading documents...</p>
            <p className="text-gray-400 text-sm mt-1">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <p className="font-semibold text-gray-800 text-lg">Error loading documents</p>
            <p className="text-gray-500 text-sm mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgb(132,42,59)]/10 rounded-xl">
              <FileText className="h-6 w-6 text-[rgb(132,42,59)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Documents</h1>
              <p className="text-xs text-gray-500">{documents.length} total</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Categories</p>
          <div className="space-y-1">
            {categories.map((category) => {
              const count = category === "All" 
                ? documents.length 
                : documents.filter(d => d.template?.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                    selectedCategory === category
                      ? "bg-[rgb(132,42,59)] text-white font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedCategory === category
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort Options */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sort By</p>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name")}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results info */}
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <span>Showing {filteredDocuments.length} of {documents.length} documents</span>
            {selectedCategory !== "All" && (
              <span className="px-2 py-0.5 bg-[rgb(132,42,59)]/10 text-[rgb(132,42,59)] rounded-full text-xs font-medium">
                {selectedCategory}
              </span>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FolderOpen className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700">No documents found</h3>
              <p className="text-sm mt-1 text-center max-w-sm">
                {searchQuery || selectedCategory !== "All"
                  ? "Try adjusting your search or filter criteria"
                  : "Generated documents will appear here when creators generate them from templates."}
              </p>
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-4">Document</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Created By</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-100">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <span className="font-medium text-gray-900 truncate">
                        {doc.template?.template_name || "Untitled"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {doc.template?.category || "General"}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600 truncate">
                      {doc.user?.name || doc.user?.email || "Unknown"}
                    </div>
                    <div className="col-span-2 text-sm text-gray-500">
                      {formatDate(doc.created_at)}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(doc.generated_document_url, doc.template?.template_name)}
                        className="p-2 text-gray-500 hover:text-[rgb(132,42,59)] hover:bg-[rgb(132,42,59)]/10 rounded-lg transition-all"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                        title="Delete"
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
          )}
        </div>
      </main>
    </div>
  );
}