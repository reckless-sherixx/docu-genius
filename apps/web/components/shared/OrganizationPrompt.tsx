"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBuilding, IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";

export default function OrganizationPrompt() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading" && session) {
      checkOrganization();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session]);

  const checkOrganization = async () => {
    const token = session?.user?.token;
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/organizations", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        if (!data.data || data.data.length === 0) {
          setShow(true);
        }
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = () => {
    router.push("/onboarding");
  };

  if (loading || !show) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="bg-gradient-to-r from-[rgb(132,42,59)] to-[rgb(132,42,59)] rounded-lg p-4 shadow-lg border border-[#a0527d]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <IconBuilding className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm md:text-base">
                Join an Organization to See Your Stats
              </h3>
              <p className="text-white/80 text-xs md:text-sm">
                Create or join an organization to unlock all features
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleJoinOrganization}
              className="bg-white text-[rgb(132,42,59)] px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Get Started
            </button>
            <button
              onClick={() => setShow(false)}
              className="text-white/80 hover:text-white p-1 transition-colors"
              aria-label="Close"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
