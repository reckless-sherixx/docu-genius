"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { FileText, Clock, Download, Search, X } from "lucide-react";

interface CreationLog {
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

export default function CreationLogsComponent() {
  const { data: session, status } = useSession();
  const organizationId = useOrganizationId();
  const [logs, setLogs] = useState<CreationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const hasFetched = useRef(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  const token = session?.user?.token;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.template?.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  useEffect(() => {
    const fetchLogs = async () => {
      if (!token || !organizationId || status === "loading") {
        if (status !== "loading") setLoading(false);
        return;
      }

      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${backendUrl}/api/generated-documents/${organizationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setLogs(data.data || []);
          }
        } else {
          const errorData = await response.json();
          setError(errorData.message || "Failed to fetch logs");
        }
      } catch (err) {
        console.error("Error fetching creation logs:", err);
        setError("Failed to load creation logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [token, organizationId, status, backendUrl]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
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
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-80 bg-gray-100 rounded-xl animate-pulse"></div>
          </div>
        </header>
        <div className="flex-1 p-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-32 bg-gray-100 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-500" />
          </div>
          <p className="font-semibold text-gray-800 text-lg">Error loading logs</p>
          <p className="text-gray-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgb(132,42,59)]/10 rounded-xl">
              <Clock className="h-6 w-6 text-[rgb(132,42,59)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Creation Logs</h1>
              <p className="text-sm text-gray-500">{logs.length} total entries</p>
            </div>
          </div>
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user or template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent"
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
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No logs found</h3>
            <p className="text-sm mt-1 text-center max-w-sm">
              {searchQuery
                ? "Try adjusting your search criteria"
                : "Document generation logs will appear here when users generate documents using their PIN."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-3">User</div>
              <div className="col-span-3">Document</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Date & Time</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredLogs.map((log) => {
                const { date, time } = formatDateTime(log.created_at);
                return (
                  <div
                    key={log.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                  >
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[rgb(132,42,59)] to-[rgb(152,52,69)] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {(log.user?.name?.[0] || log.user?.email?.[0] || "U").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{log.user?.name || "Unknown"}</p>
                        <p className="text-xs text-gray-500 truncate">{log.user?.email}</p>
                      </div>
                    </div>

                    <div className="col-span-3 flex items-center gap-3">
                      <span className="font-medium text-gray-800 truncate">
                        {log.template?.template_name || "Untitled"}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {({ GENERAL: 'General', LEGAL: 'Legal', FINANCE: 'Finance', HR: 'HR', MARKETING: 'Marketing', SALES: 'Sales', OTHER: 'Other' }[log.template?.category || 'GENERAL']) || log.template?.category}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900">{date}</span>
                        <span className="text-xs text-gray-500">{time}</span>
                      </div>
                      <span className="text-xs text-[rgb(132,42,59)] font-medium">{getTimeAgo(log.created_at)}</span>
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(log.generated_document_url)}
                        className="p-2 text-gray-500 hover:text-[rgb(132,42,59)] hover:bg-[rgb(132,42,59)]/10 rounded-lg transition-all"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
