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
  X,
} from "lucide-react";
import { toast } from "sonner";

interface GeneratedDocument {
  id: string;
  document_number?: string;
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

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  const token = session?.user?.token;

  const CATEGORY_LABELS: Record<string, string> = {
    GENERAL: 'General',
    LEGAL: 'Legal',
    FINANCE: 'Finance',
    HR: 'HR',
    MARKETING: 'Marketing',
    SALES: 'Sales',
    OTHER: 'Other',
  };

  const categories = ['All', 'GENERAL', 'LEGAL', 'FINANCE', 'HR', 'MARKETING', 'SALES', 'OTHER'];

  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch =
        doc.template?.template_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        doc.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" ||
        (doc.template?.category || 'GENERAL') === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "newest")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      if (sortBy === "oldest")
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      return (a.template?.template_name || "").localeCompare(
        b.template?.template_name || "",
      );
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
          },
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
        },
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
        {/* Sidebar Skeleton */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
              <div>
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse mt-1" />
              </div>
            </div>
          </div>

          {/* Categories Skeleton */}
          <div className="p-4 flex-1">
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {/* Sort Skeleton */}
          <div className="p-4 border-t border-gray-100">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Search Bar Skeleton */}
          <div className="mb-6">
            <div className="h-12 w-full max-w-md bg-gray-200 rounded-xl animate-pulse" />
          </div>

          {/* Documents Grid Skeleton */}
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
              >
                {/* Icon Skeleton */}
                <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
                
                {/* Content Skeleton */}
                <div className="flex-1 min-w-0">
                  <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="flex items-center gap-4 mt-2">
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>

                {/* Actions Skeleton */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-9 h-9 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="w-9 h-9 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
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
            <p className="font-semibold text-gray-800 text-lg">
              Error loading documents
            </p>
            <p className="text-gray-500 text-sm mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgb(132,42,59)]/10 rounded-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-5 text-[rgb(132,42,59)]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Documents</h1>
              <p className="text-xs text-gray-500">{documents.length} total</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent transition-all"
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

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "newest" | "oldest" | "name")
              }
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Horizontal Category Tabs */}
        <div className="px-8 pb-3 flex items-center gap-2 overflow-x-auto">
          {categories.map((category) => {
            const count =
              category === "All"
                ? documents.length
                : documents.filter((d) => (d.template?.category || 'GENERAL') === category)
                    .length;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? "bg-[rgb(132,42,59)] text-white font-medium"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{CATEGORY_LABELS[category] || category}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedCategory === category
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results info */}
        <div className="px-8 pb-3 flex items-center gap-2 text-sm text-gray-500">
          <span>
            Showing {filteredDocuments.length} of {documents.length} documents
          </span>
          {selectedCategory !== "All" && (
            <span className="px-2 py-0.5 bg-[rgb(132,42,59)]/10 text-[rgb(132,42,59)] rounded-full text-xs font-medium">
              {CATEGORY_LABELS[selectedCategory] || selectedCategory}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FolderOpen className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700">
                No documents found
              </h3>
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
                <div className="col-span-2">Doc ID</div>
                <div className="col-span-3">Document</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Created By</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-100">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                  >
                    <div className="col-span-2">
                      <span className="font-mono text-sm text-[rgb(132,42,59)] font-medium">
                        {doc.document_number || "-"}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center gap-3">
                      <span className="font-medium text-gray-900 truncate">
                        {doc.template?.template_name || "Untitled"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {CATEGORY_LABELS[doc.template?.category || 'GENERAL'] || doc.template?.category}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600 truncate">
                      {doc.user?.name || doc.user?.email || "Unknown"}
                    </div>
                    <div className="col-span-2 text-sm text-gray-500">
                      {formatDate(doc.created_at)}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          handleDownload(
                            doc.generated_document_url,
                            doc.template?.template_name,
                          )
                        }
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
      </main>
    </div>
  );
}
