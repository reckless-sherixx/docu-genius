"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "./SidebarComponent";
import { useOrganization } from "@/contexts/OrganizationContext";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconArrowLeft,
  IconSettings,
  IconLayoutDashboard,
  IconFileText,
  IconTrendingUp,
  IconUsers,
  IconBookmark,
  IconChevronDown,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import CloudIcon from "@/public/CloudWhite.png";
import DashboardContent from "./DashboardContent";
import Image from "next/image";

export function SidebarDemo({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const organizationId = pathname?.split('/')[2]; 
  const userId = session?.user?.id; 
 const mainLinks = [
    {
      label: "Dashboard",
      href: `/dashboard/${organizationId}`,
      icon: (
        <IconLayoutDashboard className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  const analyticsLinks = [
    {
      label: "Templates",
      href: `/dashboard/${organizationId}/templates`,
      icon: (
        <IconTrendingUp className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Upload Template",
      href: `/dashboard/${organizationId}/template`,
      icon: (
        <IconFileText className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  const organizationLinks = [
    {
      label: "Members",
      href: `/dashboard/${organizationId}/members`,
      icon: (
        <IconUsers className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Generated Documents",
      href: `/dashboard/${organizationId}/generated-documents`,
      icon: (
        <IconBookmark className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Team Leads",
      href: "#",
      icon: (
        <IconUsers className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  const personaliseLinks = [
    {
      label: "Catalog",
      href: "#",
      icon: (
        <IconBookmark className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Profile",
      href: `/${userId}/profile`,
      icon: (
        <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Logout",
      href: "#",
      icon: (
        <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full h-screen overflow-hidden bg-white flex-col sm:flex-row">
      <Sidebar open={open} setOpen={setOpen} animate={true}>
        <SidebarBody className="justify-between gap-10 bg-white p-0">
          <SidebarContent
            mainLinks={mainLinks}
            analyticsLinks={analyticsLinks}
            organizationLinks={organizationLinks}
            personaliseLinks={personaliseLinks}
          />
        </SidebarBody>
      </Sidebar>
      <div className="flex-1 overflow-auto">
        {children || <DashboardContent />}
      </div>
    </div>
  );
}

const SidebarContent = ({
  mainLinks,
  analyticsLinks,
  organizationLinks,
  personaliseLinks,
}: {
  mainLinks: any[];
  analyticsLinks: any[];
  organizationLinks: any[];
  personaliseLinks: any[];
}) => {
  const { open, animate } = useSidebar();

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
      <div className="bg-[#3a3a3a] py-6 mb-5 relative flex items-center justify-center">
        <Logo />
        <motion.div
          animate={{
            display: animate ? (open ? "block" : "none") : "block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="absolute right-5 top-1/2 -translate-y-1/2"
        >
        </motion.div>
      </div>

      {/* Organization Selector */}
      <OrganizationSelector />  

      {/* Dashboard Section */}
      <div className="flex flex-col px-4">
        {mainLinks.map((link, idx) => (
          <SidebarLink key={idx} link={link} />
        ))}
      </div>

      {/* Analytics Section */}
      <div className="mt-4 px-4 sm:mt-6">
        <motion.p
          animate={{
            display: animate ? (open ? "block" : "none") : "block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3"
        >
          ANALYTICS
        </motion.p>
        <div className="flex flex-col ">
          {analyticsLinks.map((link, idx) => (
            <SidebarLink key={idx} link={link} />
          ))}
        </div>
      </div>

      {/* Support Section */}
      <div className="mt-4 px-4 sm:mt-6">
        <motion.p
          animate={{
            display: animate ? (open ? "block" : "none") : "block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3"
        >
          SUPPORT
        </motion.p>
        <div className="flex flex-col">
          {organizationLinks.map((link, idx) => (
            <div key={idx} className="relative">
              <SidebarLink link={link} />
              {link.badge && (
                <motion.span
                  animate={{
                    display: animate ? (open ? "flex" : "none") : "flex",
                    opacity: animate ? (open ? 1 : 0) : 1,
                  }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 items-center justify-center"
                >
                  {link.badge}
                </motion.span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Personalise Section */}
      <div className="mt-35 px-4 sm:mt-35">
        <motion.p
          animate={{
            display: animate ? (open ? "block" : "none") : "block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3"
        >
          PERSONALISE
        </motion.p>
        <div className="flex flex-col">
          {personaliseLinks.map((link, idx) => (
            <SidebarLink key={idx} link={link} />
          ))}
        </div>
      </div>
    </div >
  );
};

export const Logo = () => {
  const { open, animate } = useSidebar();

  return (
    <a
      href="#"
      className="relative z-20 flex items-center justify-center gap-3 w-full px-3"
    >
      {/* Cloud Icon */}
      <div className="shrink-0 flex items-center justify-center">
        <Image
          src={CloudIcon}
          alt="Cloud Icon"
          className="h-7 w-11"
        />
      </div>

      {/* DocuGenius Text */}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="font-medium whitespace-nowrap text-white text-2xl"
      >
        DocuGenius
      </motion.span>
    </a>
  );
};

export const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-6 w-6 shrink-0 rounded bg-black dark:bg-white flex items-center justify-center">
        <span className="text-white dark:text-black font-bold text-sm">D</span>
      </div>
    </a>
  );
};

// Organization Selector Component
const OrganizationSelector = () => {
  const { open, animate } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const { organizations, loadingOrgs } = useOrganization();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Extract organizationId from URL
  const organizationId = pathname?.split('/')[2]; 
  const selectedOrganization = organizations.find(org => org.id === organizationId);

  const handleOrganizationChange = (orgId: string) => {
    // Preserve the current route structure but change organization
    const pathParts = pathname?.split('/') || [];
    if (pathParts.length >= 3 && pathParts[1] === 'dashboard') {
      // Replace organizationId in path
      pathParts[2] = orgId;
      router.push(pathParts.join('/'));
    } else {
      // Default to dashboard home for that organization
      router.push(`/dashboard/${orgId}`);
    }
    setIsDropdownOpen(false);
  };

  if (loadingOrgs) {
    return (
      <div className="px-3 mb-6">
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500">
          <div className="h-4 w-4 border-2 border-gray-300 border-t-[rgb(132,42,59)] rounded-full animate-spin"></div>
          <motion.span
            animate={{
              display: animate ? (open ? "inline" : "none") : "inline",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            Loading...
          </motion.span>
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="px-3 mb-6">
        <div className="text-xs text-yellow-600 text-center py-2">
          No organizations
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="px-3 mb-6 relative">
      <motion.div 
        className="mb-2 px-2"
        animate={{
          display: animate ? (open ? "block" : "none") : "block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <p className="text-xs font-semibold text-gray-500 uppercase">
          ORGANIZATIONS
        </p>
      </motion.div>

      {/* Selected Organization Display */}
      <button
        onClick={() => open && setIsDropdownOpen(!isDropdownOpen)}
        className={`w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 hover:border hover:border-gray-200 rounded-lg transition-all hover:shadow group ${
          open ? 'justify-start' : 'justify-center'
        }`}
      >
        {/* Organization Icon */}
        <div className="h-10 w-10 shrink-0 rounded-md bg-[rgb(132,42,59)] flex items-center justify-center text-white font-bold text-base">
          {selectedOrganization ? getInitials(selectedOrganization.name) : 'S'}
        </div>

        {open && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{
              opacity: animate ? 1 : 1,
              width: animate ? "auto" : "auto",
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 text-left min-w-0"
          >
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {selectedOrganization?.name || 'Select Organization'}
            </p>
          </motion.div>
        )}

        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: animate ? 1 : 1,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="shrink-0"
          >
            <IconChevronDown className={`h-4 w-4 text-gray-500 transition-transform group-hover:text-gray-700 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </motion.div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && open && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="absolute left-3 right-3 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-64 overflow-y-auto">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleOrganizationChange(org.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  org.id === organizationId ? 'bg-blue-50' : ''
                }`}
              >
                <div className={`h-10 w-10 shrink-0 rounded-md flex items-center justify-center text-white font-bold text-base ${
                  org.id === organizationId ? 'bg-blue-600' : 'bg-gray-500'
                }`}>
                  {getInitials(org.name)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm font-semibold truncate ${
                    org.id === organizationId ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {org.name}
                  </p>
                </div>
                {org.id === organizationId && (
                  <svg className="h-5 w-5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
