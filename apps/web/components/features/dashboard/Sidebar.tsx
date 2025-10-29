"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "./SidebarComponent";
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
import Arrow from '@/public/arrow.png'
import DashboardContent from "./DashboardContent";
import Image from "next/image";
import Link from "next/link";

export function SidebarDemo() {
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
      label: "Performance",
      href: "#",
      icon: (
        <IconTrendingUp className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Documents",
      href: "#",
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
      <Sidebar open={open} setOpen={setOpen} animate={false}>
        <SidebarBody className="justify-between gap-10 bg-white p-0">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <div className="bg-[#3a3a3a] px-5 py-6 mb-5 relative">
              <Logo />
              <Link href="#" className="absolute right-5 top-1/2 -translate-y-1/2">
                <Image
                  src={Arrow}
                  alt="Arrow Icon"
                  className="w-7 h-7 opacity-60 hover:opacity-100 transition-opacity"
                />
              </Link>
            </div>

            {/* Create New Template Button */}
            <div className="px-4 mb-6 sm:mb-8">
              <button className="w-full flex items-center justify-center gap-2 bg-[rgb(132,42,59)] hover:bg-[rgb(139,42,52)] text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition text-sm">
                <IconPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Create New Template</span>
                <span className="sm:hidden">Create</span>
              </button>
            </div>

            {/* Dashboard Section */}
            <div className="flex flex-col px-4">
              {mainLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>

            {/* Analytics Section */}
            <div className="mt-4 px-4 sm:mt-6">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3">
                ANALYTICS
              </p>
              <div className="flex flex-col ">
                {analyticsLinks.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
            </div>

            {/* Support Section */}
            <div className="mt-4 px-4 sm:mt-6">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3">
                SUPPORT
              </p>
              <div className="flex flex-col">
                {organizationLinks.map((link, idx) => (
                  <div key={idx} className="relative">
                    <SidebarLink link={link} />
                    {link.badge && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {link.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Personalise Section */}
            <div className="mt-35 px-4 sm:mt-40">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3">
                PERSONALISE
              </p>
              <div className="flex flex-col">
                {personaliseLinks.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
      <DashboardContent />
    </div>
  );
}

export const Logo = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center gap-3"
    >
      {/* Cloud Icon */}
      <div className="shrink-0">
        <Image
          src={CloudIcon}
          alt="Cloud Icon"
          className="h-7 w-11"
        />
      </div>
      
      {/* DocuGenius Text */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-white text-2xl"
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
