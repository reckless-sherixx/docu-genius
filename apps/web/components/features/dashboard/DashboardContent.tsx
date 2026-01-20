"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, FileText, Download, Wifi, WifiOff } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useOrganizationId } from '@/hooks/use-organization-id'
import { useSocket } from '@/hooks/useSocket'
import Link from 'next/link'

interface GeneratedDocument {
    id: string
    generated_document_url: string
    template_id: string
    generated_by: string
    organization_id: string
    created_at: string
    template: {
        id: string
        template_name: string
        category: string | null
    }
    user: {
        id: string
        name: string
        email: string
    }
}

interface TeamMember {
    id: string
    user: {
        id: string
        name: string
        email: string
        image?: string | null
    }
    role: string
    joined_at: string
}

interface Notification {
    id: string
    type: 'document_generated' | 'member_joined'
    message: string
    documentId?: string
    createdAt: Date
    read: boolean
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Completed':
            return 'bg-green-100 text-green-700'
        case 'Pending':
            return 'bg-yellow-100 text-yellow-700'
        case 'Processing':
            return 'bg-blue-100 text-blue-700'
        default:
            return 'bg-gray-100 text-gray-700'
    }
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

const getInitials = (name: string) => {
    if (!name) return '??'
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

const getTimeSince = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    return 'Just now'
}

export default function DashboardContent() {
    const { data: session, status: sessionStatus } = useSession()
    const organizationId = useOrganizationId()
    
    // Socket.io connection for real-time updates
    const { 
        isConnected, 
        onDocumentGenerated, 
        onMemberJoined,
        onMemberRemoved,
        onMemberRoleUpdated 
    } = useSocket({ organizationId: organizationId || undefined })
    
    const [documents, setDocuments] = useState<GeneratedDocument[]>([])
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [loadingDocs, setLoadingDocs] = useState(true)
    const [loadingMembers, setLoadingMembers] = useState(true)
    
    const hasFetchedDocs = useRef(false)
    const hasFetchedMembers = useRef(false)
    
    const userName = session?.user?.name || 'User'
    const userImage = session?.user?.image
    const token = session?.user?.token

    // Fetch generated documents
    const fetchDocuments = useCallback(async () => {
        if (!token || !organizationId) return
        
        if (hasFetchedDocs.current) return
        hasFetchedDocs.current = true
        
        try {
            setLoadingDocs(true)
            
            const response = await fetch(`/api/organizations/${organizationId}/documents`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                cache: 'no-store'
            })
            
            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setDocuments(data.data || [])
                }
            }
        } catch (error) {
            console.error('Error fetching documents:', error)
        } finally {
            setLoadingDocs(false)
        }
    }, [token, organizationId])

    // Fetch team members
    const fetchMembers = useCallback(async () => {
        if (!token || !organizationId) return
        
        if (hasFetchedMembers.current) return
        hasFetchedMembers.current = true
        
        try {
            setLoadingMembers(true)
            
            const response = await fetch(`/api/organizations/${organizationId}/members`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                cache: 'no-store'
            })
            
            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setTeamMembers(data.data || [])
                }
            }
        } catch (error) {
            console.error('Error fetching members:', error)
        } finally {
            setLoadingMembers(false)
        }
    }, [token, organizationId])

    // Initial data fetch
    useEffect(() => {
        if (sessionStatus === 'authenticated' && organizationId) {
            fetchDocuments()
            fetchMembers()
        }
    }, [sessionStatus, organizationId, fetchDocuments, fetchMembers])

    // Socket.io event listeners for real-time updates
    useEffect(() => {
        if (!isConnected) return

        // Listen for new document generation
        const unsubscribeDocGen = onDocumentGenerated((data) => {
            console.log('📄 New document generated:', data)
            
            // Add notification
            const newNotification: Notification = {
                id: `notif-${Date.now()}`,
                type: 'document_generated',
                message: `${data.userName} generated "${data.templateName}"`,
                documentId: data.documentId,
                createdAt: new Date(data.createdAt),
                read: false
            }
            setNotifications(prev => [newNotification, ...prev].slice(0, 10))
            
            // Refetch documents to get the new one
            hasFetchedDocs.current = false
            fetchDocuments()
        })

        // Listen for new member joining
        const unsubscribeMemberJoin = onMemberJoined((data) => {
            console.log('👤 New member joined:', data)
            
            // Add notification
            const newNotification: Notification = {
                id: `notif-${Date.now()}`,
                type: 'member_joined',
                message: `${data.userName} joined the organization`,
                createdAt: new Date(data.joinedAt),
                read: false
            }
            setNotifications(prev => [newNotification, ...prev].slice(0, 10))
            
            // Refetch members
            hasFetchedMembers.current = false
            fetchMembers()
        })

        // Listen for member removal
        const unsubscribeMemberRemove = onMemberRemoved((data) => {
            console.log('🚫 Member removed:', data)
            
            // Update team members list
            setTeamMembers(prev => prev.filter(m => m.user?.id !== data.memberId))
        })

        // Listen for role updates
        const unsubscribeRoleUpdate = onMemberRoleUpdated((data) => {
            console.log('🔄 Member role updated:', data)
            
            // Update the member's role in state
            setTeamMembers(prev => prev.map(m => 
                m.user?.id === data.memberId 
                    ? { ...m, role: data.newRole }
                    : m
            ))
        })

        return () => {
            unsubscribeDocGen()
            unsubscribeMemberJoin()
            unsubscribeMemberRemove()
            unsubscribeRoleUpdate()
        }
    }, [isConnected, onDocumentGenerated, onMemberJoined, onMemberRemoved, onMemberRoleUpdated, fetchDocuments, fetchMembers])

    // Calculate stats
    const totalDocuments = documents.length
    const recentDocs = documents.filter(doc => {
        const docDate = new Date(doc.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return docDate >= weekAgo
    })
    const unreadNotifications = notifications.filter(n => !n.read).length

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const latestDocument = documents[0]
    const lastUpdateTime = latestDocument ? getTimeSince(latestDocument.created_at) : 'No updates'

    return (
        <div className="flex-1 overflow-auto bg-gray-50 w-full">
            {/* Top Header/Navbar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4">
                    <div>
                        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                            Hey {userName.split(' ')[0]} -
                        </h1>
                        <p className="text-gray-500 text-xs">
                            here's what's happening with your documents today
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        {/* Connection Status Indicator */}
                        <div 
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                isConnected 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-500'
                            }`}
                            title={isConnected ? 'Connected - Real-time updates active' : 'Connecting...'}
                        >
                            {isConnected ? (
                                <Wifi className="h-3 w-3" />
                            ) : (
                                <WifiOff className="h-3 w-3" />
                            )}
                            <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
                        </div>
                        
                        {/* Notifications Button */}
                        <div className="relative">
                            <button 
                                className="relative p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <Bell className="h-5 w-5 text-gray-600" />
                                {unreadNotifications > 0 && (
                                    <span className="absolute top-1 right-1 h-4 w-4 bg-[rgb(132,42,59)] rounded-full text-white text-xs flex items-center justify-center">
                                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                    </span>
                                )}
                            </button>
                            
                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setShowNotifications(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
                                        <div className="flex items-center justify-between p-3 border-b border-gray-100">
                                            <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
                                            {unreadNotifications > 0 && (
                                                <button 
                                                    onClick={markAllAsRead}
                                                    className="text-xs text-[rgb(132,42,59)] hover:underline"
                                                >
                                                    Mark all as read
                                                </button>
                                            )}
                                        </div>
                                        
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500 text-sm">
                                                No notifications yet
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {notifications.map(notification => (
                                                    <div 
                                                        key={notification.id}
                                                        className={`p-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <FileText className="h-4 w-4 text-[rgb(132,42,59)] mt-0.5 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-gray-900">{notification.message}</p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {getTimeSince(notification.createdAt.toISOString())}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {/* User Profile Picture */}
                        {userImage ? (
                            <img
                                src={userImage}
                                alt={userName}
                                className="h-8 w-8 rounded-full flex-shrink-0 object-cover"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded-full flex-shrink-0 bg-[rgb(132,42,59)] flex items-center justify-center text-white text-sm font-semibold">
                                {getInitials(userName)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-3 sm:p-4 lg:p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-xs font-semibold mb-2">TOTAL DOCUMENTS</p>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900">{totalDocuments}</span>
                            <span className="text-green-600 text-xs hidden sm:inline">Last: {lastUpdateTime}</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">generated</span>
                    </div>

                    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-xs font-semibold mb-2">THIS WEEK</p>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900">{recentDocs.length}</span>
                            <span className="text-blue-600 text-xs hidden sm:inline">Recent activity</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">documents</span>
                    </div>

                    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-xs font-semibold mb-2">TEAM MEMBERS</p>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900">{teamMembers.length}</span>
                            <span className="text-purple-600 text-xs hidden sm:inline">Active</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">collaborators</span>
                    </div>

                    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-xs font-semibold mb-2">NOTIFICATIONS</p>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900">{unreadNotifications}</span>
                            <span className="text-orange-600 text-xs hidden sm:inline">Unread</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">new updates</span>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Analytics & Queries Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
                                Generated Documents
                            </h2>

                            {/* Documents Table */}
                            <div className="mb-6 sm:mb-8">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-1">
                                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Recent Documents</h3>
                                    <Link 
                                        href={`/dashboard/${organizationId}/creation-logs`}
                                        className="text-[rgb(132,42,59)] text-xs sm:text-sm hover:underline"
                                    >
                                        See All Documents →
                                    </Link>
                                </div>
                                <p className="text-xs text-gray-500 mb-4">Your recently generated PDFs</p>

                                {loadingDocs ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="animate-pulse flex items-center gap-4 p-3">
                                                <div className="h-10 w-10 bg-gray-200 rounded"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : documents.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                        <p className="text-sm">No documents generated yet</p>
                                        <p className="text-xs mt-1">Create a template and generate your first document</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                                        <table className="w-full text-xs sm:text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                                                        Document
                                                    </th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">
                                                        Created
                                                    </th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">
                                                        Created By
                                                    </th>
                                                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                                                        Status
                                                    </th>
                                                    <th className="text-center py-3 px-4"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {documents.slice(0, 5).map((doc) => (
                                                    <tr
                                                        key={doc.id}
                                                        className="border-b border-gray-200 hover:bg-gray-50"
                                                    >
                                                        <td className="py-3 sm:py-4 px-4">
                                                            <div>
                                                                <p className="font-medium text-gray-900 text-xs sm:text-sm">
                                                                    {doc.template?.template_name || 'Untitled Document'}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {doc.template?.category || 'No category'}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 sm:py-4 px-4 text-gray-600 hidden sm:table-cell">
                                                            <span className="text-xs sm:text-sm">{formatDate(doc.created_at)}</span>
                                                        </td>
                                                        <td className="py-3 sm:py-4 px-4 text-gray-600 hidden md:table-cell">
                                                            <span className="text-xs sm:text-sm">{doc.user?.name || 'Unknown'}</span>
                                                        </td>
                                                        <td className="py-3 sm:py-4 px-4 text-center">
                                                            <span
                                                                className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor('Completed')}`}
                                                            >
                                                                ● <span className="hidden sm:inline ml-1">Completed</span>
                                                            </span>
                                                        </td>
                                                        <td className="py-3 sm:py-4 px-4 text-center">
                                                            <a 
                                                                href={doc.generated_document_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-gray-400 hover:text-[rgb(132,42,59)]"
                                                                title="Download"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-4 sm:space-y-6">
                        {/* Meet Your Team Card */}
                        <div className="bg-[#3a3a3a] text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] rounded-lg p-4 sm:p-6">
                            <h3 className="font-semibold mb-1 text-sm sm:text-base">Meet Your Team</h3>
                            <p className="text-xs text-gray-400 mb-3 sm:mb-4">
                                Collaborators in your organization
                            </p>

                            {loadingMembers ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse flex items-center gap-3">
                                            <div className="h-10 w-10 bg-gray-600 rounded-full"></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-gray-600 rounded w-2/3"></div>
                                                <div className="h-2 bg-gray-600 rounded w-1/2"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : teamMembers.length === 0 ? (
                                <div className="text-center py-4 text-gray-400">
                                    <p className="text-sm">No team members yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3 sm:space-y-4">
                                    {teamMembers.slice(0, 4).map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-start gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-gray-700 last:border-b-0"
                                        >
                                            {member.user?.image ? (
                                                <img
                                                    src={member.user.image}
                                                    alt={member.user?.name || 'User'}
                                                    className="h-8 sm:h-10 w-8 sm:w-10 rounded-full flex-shrink-0 object-cover"
                                                />
                                            ) : (
                                                <div className="h-8 sm:h-10 w-8 sm:w-10 rounded-full flex-shrink-0 bg-[rgb(132,42,59)] flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                                                    {getInitials(member.user?.name || '')}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-xs sm:text-sm">{member.user?.name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-400 truncate">
                                                    {member.user?.email || ''}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-xs font-medium px-2 py-0.5 rounded ${
                                                    member.role === 'ADMIN' 
                                                        ? 'bg-[rgb(132,42,59)] text-white' 
                                                        : 'bg-gray-600 text-gray-200'
                                                }`}>
                                                    {member.role}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {getTimeSince(member.joined_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {teamMembers.length > 4 && (
                                <Link 
                                    href={`/dashboard/${organizationId}/members`}
                                    className="w-full text-center text-xs text-gray-400 mt-3 sm:mt-4 hover:text-gray-200 block"
                                >
                                    SEE ALL {teamMembers.length} COLLABORATORS &gt;
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
