"use client"

import React, { useState } from 'react'
import { Bell } from 'lucide-react'

interface Document {
    id: string
    name: string
    description: string
    status: 'Completed' | 'Pending' | 'Cancelled'
    lastUpdate: string
    member: string
    role: string
}

const documents: Document[] = [
    {
        id: '1',
        name: 'Gemma Resource',
        description: 'Dashboard Recursion',
        status: 'Completed',
        lastUpdate: 'Jan 17, 2022',
        member: 'Jenny.W',
        role: 'Member'
    },
    {
        id: '2',
        name: 'Recursion Management',
        description: 'Report Update',
        status: 'Completed',
        lastUpdate: 'Jan 17, 2022',
        member: 'Devon.L',
        role: 'Member'
    },
    {
        id: '3',
        name: 'Leave Reports Doc',
        description: 'Query Content',
        status: 'Pending',
        lastUpdate: 'Jan 17, 2022',
        member: 'Jane.C',
        role: 'Member'
    },
    {
        id: '4',
        name: 'Annex Card Report',
        description: 'Lorem Ipsum',
        status: 'Cancelled',
        lastUpdate: 'Jan 17, 2022',
        member: 'Dianne.R',
        role: 'Member'
    }
]

const teamMembers = [
    {
        id: '1',
        name: 'Jenny Wilson',
        email: 'jenny.wilson@example.com',
        comments: '3 comments',
        role: 'Austin'
    },
    {
        id: '2',
        name: 'Devon Lane',
        email: 'devon.lane@example.com',
        comments: '2 comments',
        role: 'New York'
    },
    {
        id: '3',
        name: 'Jane Cooper',
        email: 'jane.cooper@example.com',
        comments: '15 comments',
        role: 'Toledo'
    },
    {
        id: '4',
        name: 'Dianne Russell',
        email: 'dianne.russell@example.com',
        comments: '258 comments',
        role: 'Naperville'
    }
]

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Completed':
            return 'bg-green-100 text-green-700'
        case 'Pending':
            return 'bg-yellow-100 text-yellow-700'
        case 'Cancelled':
            return 'bg-red-100 text-red-700'
        default:
            return 'bg-gray-100 text-gray-700'
    }
}

export default function DashboardContent() {
    const [timeRange, setTimeRange] = useState('12 Months')

    return (
        <div className="flex-1 overflow-auto bg-gray-50 w-full">
            {/* Top Header/Navbar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4">
                    <div>
                        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                            Hey Abhimanyu -
                        </h1>
                        <p className="text-gray-500 text-xs">
                            here's what's happening with your documents today
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        <button className="relative p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
                            <Bell className="h-5 w-5 text-gray-600" />
                            <span className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full" />
                        </button>
                        <img
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=user"
                            alt="Profile"
                            className="h-8 w-8 rounded-full flex-shrink-0"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-3 sm:p-4 lg:p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-xs font-semibold mb-2">YOUR DRAFTS</p>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900">1</span>
                            <span className="text-green-600 text-xs hidden sm:inline">Last Update 2 days ago</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">doc</span>
                    </div>

                    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-xs font-semibold mb-2">ACTIONS REQUIRED</p>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900">3</span>
                            <span className="text-red-600 text-xs hidden sm:inline">Urgent needed</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">actions</span>
                    </div>

                    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-xs font-semibold mb-2">WAITING FOR OTHERS</p>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900">2</span>
                            <span className="text-blue-600 text-xs hidden sm:inline">Waiting - Solution</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">docs</span>
                    </div>

                    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-xs font-semibold mb-2">FINALIZED</p>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900">1</span>
                            <span className="text-purple-600 text-xs hidden sm:inline">Successfully uploaded</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">doc</span>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Analytics & Queries Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
                                Analytics & Queries
                            </h2>

                            {/* Documents Table */}
                            <div className="mb-6 sm:mb-8">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-1">
                                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Documents</h3>
                                    <a href="#" className="text-blue-600 text-xs sm:text-sm hover:underline">
                                        See All Documents →
                                    </a>
                                </div>
                                <p className="text-xs text-gray-500 mb-4">All your Documents</p>

                                <div className="overflow-x-auto -mx-4 sm:mx-0">
                                    <table className="w-full text-xs sm:text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-3 px-4 font-medium text-gray-600">
                                                    Documents
                                                </th>
                                                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">
                                                    Last Update
                                                </th>
                                                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">
                                                    Member
                                                </th>
                                                <th className="text-center py-3 px-4 font-medium text-gray-600">
                                                    Status
                                                </th>
                                                <th className="text-center py-3 px-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {documents.map((doc) => (
                                                <tr
                                                    key={doc.id}
                                                    className="border-b border-gray-200 hover:bg-gray-50"
                                                >
                                                    <td className="py-3 sm:py-4 px-4">
                                                        <div>
                                                            <p className="font-medium text-gray-900 text-xs sm:text-sm">
                                                                {doc.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {doc.description}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 sm:py-4 px-4 text-gray-600 hidden sm:table-cell">
                                                        <span className="text-xs sm:text-sm">{doc.lastUpdate}</span>
                                                    </td>
                                                    <td className="py-3 sm:py-4 px-4 text-gray-600 hidden md:table-cell">
                                                        <span className="text-xs sm:text-sm">{doc.member}</span>
                                                    </td>
                                                    <td className="py-3 sm:py-4 px-4 text-center">
                                                        <span
                                                            className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                                                doc.status
                                                            )}`}
                                                        >
                                                            ● <span className="hidden sm:inline">{doc.status}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-3 sm:py-4 px-4 text-center">
                                                        <button className="text-gray-400 hover:text-gray-600">
                                                            ⋮
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* History Section */}
                            <div className="border-t border-gray-200 pt-4 sm:pt-6">
                                <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">History</h3>
                                <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                                    {['12 Months', '6 Months', '30 Days', '7 Days'].map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setTimeRange(range)}
                                            className={`px-2 sm:px-3 py-1 text-xs font-medium rounded ${timeRange === range
                                                    ? 'bg-gray-900 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {range}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                                    <div className="text-3xl sm:text-4xl mb-2">⊗</div>
                                    <p className="text-gray-600 font-medium text-sm">
                                        Start here - or pick where you left off
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Create the first history to get started
                                    </p>
                                    <button className="mt-4 bg-red-700 hover:bg-red-800 text-white rounded-full p-2">
                                        <span className="text-xl">+</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-4 sm:space-y-6">
                        {/* Meet Your Team Card */}
                        <div className="bg-[#3a3a3a] text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] rounded-lg p-4 sm:p-6">
                            <h3 className="font-semibold mb-1 text-sm sm:text-base">Meet Your Team</h3>
                            <p className="text-xs text-gray-400 mb-3 sm:mb-4">
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean
                            </p>

                            <div className="space-y-3 sm:space-y-4">
                                {teamMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-start gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-gray-700 last:border-b-0"
                                    >
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
                                            alt={member.name}
                                            className="h-8 sm:h-10 w-8 sm:w-10 rounded-full flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-xs sm:text-sm">{member.name}</p>
                                            <p className="text-xs text-gray-400 truncate">
                                                {member.email}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs font-medium">{member.comments}</p>
                                            <p className="text-xs text-gray-400">{member.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full text-center text-xs text-gray-400 mt-3 sm:mt-4 hover:text-gray-200">
                                SEE ALL COLLABORATORS &gt;
                            </button>
                        </div>

                        {/* Uploads src Section */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Uploads src</h3>
                                <select className="text-xs text-gray-600 bg-white border-0 focus:outline-none">
                                    <option>Last 7 Days</option>
                                </select>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                {[
                                    { name: 'Direct', value: 1.43382, color: 'bg-blue-600', percent: '40%' },
                                    { name: 'Mails', value: 87.974, color: 'bg-blue-600', percent: '80%' },
                                    { name: 'Social Media', value: 45.211, color: 'bg-blue-600', percent: '50%' },
                                    { name: 'LinkedIn', value: 21.893, color: 'bg-blue-600', percent: '25%' }
                                ].map((item) => (
                                    <div key={item.name}>
                                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                                            <span className="flex items-center gap-2 text-xs sm:text-sm">
                                                {item.name}
                                            </span>
                                            <span className="text-xs sm:text-sm font-medium text-gray-900">
                                                {item.value.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className={`${item.color} h-1.5 rounded-full`}
                                                style={{ width: item.percent }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Export PDF Button */}
                        <button className="w-full bg-white border border-gray-200 text-gray-900 font-medium py-2 rounded-lg hover:bg-gray-50 text-xs sm:text-sm">
                            📥 Export PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
