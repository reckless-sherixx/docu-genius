

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useOrganizationId } from "@/hooks/use-organization-id";
import {
    FileText,
    Edit3,
    Trash2,
    Download,
    Loader2,
    FolderOpen,
    Search,
    X,
} from "lucide-react";

interface Template {
    id: string;
    template_name: string;
    template_description: string | null;
    s3_url: string | null;
    file_size: string | null;
    category: string | null;
    created_at: string;
    mime_type: string | null;
}

export function SaveTemplateComponent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const organizationId = useOrganizationId();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showSearch, setShowSearch] = useState(false);
    const hasFetched = useRef(false);

    const token = session?.user?.token;

    const categories = ['All', ...Array.from(new Set(templates.map(t => t.category || 'General')))];

    const filteredTemplates = templates.filter(template => {
        const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
        const matchesSearch = template.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (template.template_description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        return matchesCategory && matchesSearch;
    });

    const fetchTemplates = useCallback(async () => {
        if (!token || !organizationId || status === "loading") {
            if (status !== "loading") setLoadingTemplates(false);
            return;
        }

        // Prevent double fetch
        if (hasFetched.current) return;
        hasFetched.current = true;

        try {
            setLoadingTemplates(true);
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/templates?organizationId=${organizationId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    cache: 'no-store'
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('📥 Templates response:', data);
                if (data.success && data.data) {
                    setTemplates(data.data);
                }
            } else {
                console.error('❌ Failed to fetch templates:', response.status);
            }
        } catch (error) {
            console.error('❌ Error fetching templates:', error);
        } finally {
            setLoadingTemplates(false);
        }
    }, [token, organizationId, status]);

    const handleDeleteTemplate = async (templateId: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            setDeletingTemplateId(templateId);
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/templates/${templateId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${session?.user?.token}`
                    }
                }
            );

            if (response.ok) {
                setTemplates(prev => prev.filter(t => t.id !== templateId));
            } else {
                alert('Failed to delete template');
            }
        } catch (error) {
            console.error('❌ Error deleting template:', error);
            alert('Error deleting template');
        } finally {
            setDeletingTemplateId(null);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Fetch templates when organization changes
    useEffect(() => {
        if (organizationId) {
            fetchTemplates();
        }
    }, [organizationId, fetchTemplates]);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="h-6 w-6 text-[rgb(132,42,59)]" />
                        <h1 className="text-xl font-semibold text-gray-900">Template gallery</h1>
                    </div>

                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Categories
                        </div>
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                    selectedCategory === category
                                        ? 'bg-gray-100 text-gray-900 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-8 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedCategory}</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {selectedCategory === 'All'
                                    ? 'Your permanently saved editable templates'
                                    : `Templates in ${selectedCategory} category`}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {showSearch ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Search templates..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => {
                                            setShowSearch(false);
                                            setSearchQuery('');
                                        }}
                                        className="p-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        <X className="h-5 w-5 text-gray-600" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowSearch(true)}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
                                >
                                    <Search className="h-4 w-4 text-gray-600" />
                                    Search
                                </button>
                            )}

                            <button
                                onClick={fetchTemplates}
                                disabled={loadingTemplates}
                                className="text-sm text-[rgb(132,42,59)] hover:underline px-4 py-2"
                            >
                                {loadingTemplates ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Templates Grid */}
                <div className="px-8 py-6">
                    {loadingTemplates ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div
                                    key={i}
                                    className="bg-white rounded-md border border-gray-200 overflow-hidden animate-pulse"
                                >
                                    <div className="aspect-[4/4] bg-gray-200"></div>
                                    <div className="p-4">
                                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-20">
                            <FolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">
                                {searchQuery
                                    ? 'No templates found matching your search'
                                    : templates.length === 0
                                    ? 'No saved templates yet'
                                    : `No templates in ${selectedCategory} category`}
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                {templates.length === 0
                                    ? 'Upload a PDF and save it as a permanent template to see it here'
                                    : 'Try selecting a different category'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                            {filteredTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    className="bg-white rounded-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group relative"
                                >
                                    {/* Template Preview */}
                                    <div className="aspect-[4/4] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <FileText className="h-24 w-24 text-gray-300" />
                                        </div>

                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                            <button
                                                onClick={() => router.push(`/dashboard/${organizationId}/pdf-editor/${template.id}`)}
                                                className="px-18 py-1 bg-[rgb(132,42,59)] hover:bg-[rgb(139,42,52)] text-white text-sm rounded-lg transition flex items-center gap-2"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                                Edit
                                            </button>
                                            {template.s3_url && (
                                                <button
                                                    onClick={() => window.open(template.s3_url!, '_blank')}
                                                    className="p-2 bg-white hover:bg-gray-100 rounded-lg transition"
                                                    title="Download"
                                                >
                                                    <Download className="h-4 w-4 text-gray-700" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteTemplate(template.id)}
                                                disabled={deletingTemplateId === template.id}
                                                className="px-18 py-1 bg-white hover:bg-red-50 rounded-md transition disabled:opacity-50"
                                                title="Delete"
                                            >
                                                {deletingTemplateId === template.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-gray-700" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Template Info */}
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 text-base mb-1 truncate" title={template.template_name}>
                                            {template.template_name}
                                        </h3>
                                        <p className="text-sm text-gray-500">{template.category || 'General'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

