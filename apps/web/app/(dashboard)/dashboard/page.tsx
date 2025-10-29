import Dashboard from '@/components/features/dashboard/Dashboard'
import OrganizationPrompt from '@/components/shared/OrganizationPrompt'
import React from 'react'

export default function page() {
    return (
        <div>
            <OrganizationPrompt />
            <Dashboard/>
        </div>
    )
}
