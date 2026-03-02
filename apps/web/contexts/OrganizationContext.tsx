"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  role?: 'ADMIN' | 'CREATOR';
}

interface OrganizationContextType {
  organizations: Organization[];
  loadingOrgs: boolean;
  refetchOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'docu_organizations';
const STORAGE_USER_KEY = 'docu_organizations_user';

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const fetchingRef = useRef(false);
 
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    if (typeof window !== 'undefined') {
      const cachedUserId = localStorage.getItem(STORAGE_USER_KEY);
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached && cachedUserId) {
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
          
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
            localStorage.setItem(STORAGE_USER_KEY, session.user.id || '');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.token) return;
    if (fetchingRef.current) return;
    
    const currentUserId = session.user.id || '';
    const cachedUserId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_USER_KEY) : null;
    const cachedData = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    
    // Only fetch if: different user, no cache, or cache missing role data
    if (cachedUserId === currentUserId && cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        // If cache has data with role field, it's valid — skip fetch
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].role) {
          setOrganizations(parsed);
          return;
        }
      } catch (e) {
        console.warn('Invalid cached organizations data:', e);
      }
    }

    if (cachedUserId && cachedUserId !== currentUserId && typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
      setOrganizations([]);
    }

    fetchingRef.current = true;
    refetchOrganizations().finally(() => { fetchingRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id]);

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
