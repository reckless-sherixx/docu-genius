"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface Organization {
  id: string;
  name: string;
  description?: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  loadingOrgs: boolean;
  refetchOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'docu_organizations';

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
 
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('Failed to parse cached organizations', e);
        }
      }
    }
    return [];
  });
  
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const refetchOrganizations = async () => {
    if (status !== 'authenticated' || !session?.user?.token) {
      console.warn('Cannot fetch organizations: not authenticated');
      return;
    }

    try {
      setLoadingOrgs(true);
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
        if (data.success && data.data) {
          setOrganizations(data.data);
          
          // Cache in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  // Only fetch once on initial mount if no cached data exists
  useEffect(() => {
    if (fetchedRef.current) return;
  
    if (organizations.length > 0) {
      fetchedRef.current = true;
      return;
    }
    
    // Only fetch if authenticated and no cached data
    if (status === 'authenticated' && session?.user?.token) {
      fetchedRef.current = true;
      refetchOrganizations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        loadingOrgs,
        refetchOrganizations
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
