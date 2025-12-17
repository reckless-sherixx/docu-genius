

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    FileText,
    Edit3,
    Trash2,
    Download,
    Calendar,
    Loader2,
    FolderOpen
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
    const { data: session } = useSession();
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
    const [organizationId, setOrganizationId] = useState<string>('');

    const fetchTemplates = useCallback(async () => {
        if (!session?.user?.token || !organizationId) return;

        try {
            setLoadingTemplates(true);
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/templates?organizationId=${organizationId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${session.user.token}`
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
    }, [session?.user?.token, organizationId]);

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

    // Fetch user's organizations on mount
    useEffect(() => {
        const fetchOrganizations = async () => {
            if (!session?.user?.token) return;

            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/v1/organization`,
                    {
                        headers: {
                            'Authorization': `Bearer ${session.user.token}`
                        },
                        cache: 'no-store'
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    console.log('🏢 Organizations response:', data);
                    if (data.success && data.data && data.data.length > 0) {
                        setOrganizationId(data.data[0].id);
                        console.log('🏢 Selected organization:', data.data[0].name, data.data[0].id);
                    }
                }
            } catch (error) {
                console.error('❌ Error fetching organizations:', error);
            }
        };

        fetchOrganizations();
    }, [session?.user?.token]);

    // Fetch templates when organization changes
    useEffect(() => {
        if (organizationId) {
            fetchTemplates();
        }
    }, [organizationId, fetchTemplates]);

    return (
        <div>
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Saved Templates</h2>
                        <p className="text-sm text-gray-500">Your permanently saved editable templates</p>
                    </div>
                    <button
                        onClick={fetchTemplates}
                        disabled={loadingTemplates}
                        className="text-sm text-[rgb(132,42,59)] hover:underline flex items-center gap-1"
                    >
                        {loadingTemplates ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Refresh'
                        )}
                    </button>
                </div>

                {loadingTemplates ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-12">
                        <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No saved templates yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Upload a PDF and save it as a permanent template to see it here
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className="border border-gray-200 rounded-lg p-4 hover:border-[rgb(132,42,59)] hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-50 rounded-lg">
                                            <FileText className="h-6 w-6 text-[rgb(132,42,59)]" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-medium text-gray-900 truncate" title={template.template_name}>
                                                {template.template_name}
                                            </h3>
                                            <p className="text-xs text-gray-500">{template.category || 'General'}</p>
                                        </div>
                                    </div>
                                </div>

                                {template.template_description && (
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                        {template.template_description}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{formatDate(template.created_at)}</span>
                                    </div>
                                    <span>{formatFileSize(Number(template.file_size) || 0)}</span>
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={() => router.push(`/dashboard/pdf-editor/${template.id}`)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[rgb(132,42,59)] hover:bg-[rgb(139,42,52)] text-white text-sm rounded-lg transition"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                        Edit
                                    </button>
                                    {template.s3_url && (
                                        <button
                                            onClick={() => window.open(template.s3_url!, '_blank')}
                                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                                            title="Download"
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        disabled={deletingTemplateId === template.id}
                                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                        title="Delete"
                                    >
                                        {deletingTemplateId === template.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>


    )
}

