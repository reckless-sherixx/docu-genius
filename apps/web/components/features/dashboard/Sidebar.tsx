"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "./SidebarComponent";
import {
  IconArrowLeft,
  IconSettings,
  IconLayoutDashboard,
  IconFileText,
  IconTrendingUp,
  IconUsers,
  IconBookmark,
  IconPlus,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import CloudIcon from "@/public/CloudWhite.png";
import DashboardContent from "./DashboardContent";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";

export function SidebarDemo({ children }: { children?: React.ReactNode }) {
  const mainLinks = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <IconLayoutDashboard className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  const analyticsLinks = [
    {
      label: "Templates",
      href: "/dashboard/templates",
      icon: (
        <IconTrendingUp className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Upload Template",
      href: "/dashboard/template",
      icon: (
        <IconFileText className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  const organizationLinks = [
    {
      label: "Shared Documents",
      href: "#",
      icon: (
        <IconUsers className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
      badge: "5",
    },
    {
      label: "Leads",
      href: "#",
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
      label: "Settings",
      href: "#",
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

      {/* Create New Template Button */}
      <div className="px-2 mb-6 sm:mb-8">
        <Button asChild className="w-full flex items-center justify-center gap-2 bg-[rgb(132,42,59)] hover:bg-[rgb(139,42,52)] text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition text-sm">
          <Link href="/dashboard/create-template">
            <IconPlus className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <motion.span
              animate={{
                display: animate ? (open ? "inline-block" : "none") : "inline-block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="whitespace-nowrap"
            >
              Create New Template
            </motion.span>
          </Link>
        </Button>
      </div>

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
      <div className="mt-35 px-4 sm:mt-40">
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
