"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { IconBuilding, IconCheck, IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";

interface InviteData {
  id: string;
  organization: {
    id: string;
    name: string;
    description: string | null;
  };
  inviter: {
    name: string;
    email: string;
  };
  role: string;
  email: string;
}

// Get API URL from environment or use relative path
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use relative API route
    return '';
  }
  return process.env.BACKEND_URL || 'http://localhost:8000';
};

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchInviteDetails();
    }
  }, [token]);

  const fetchInviteDetails = async () => {
    try {
      const response = await fetch(
        `/api/organizations/invite/${token}`
      );

      const data = await response.json();

      if (response.ok) {
        setInvite(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to load invite details");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setProcessing(true);
    const authToken = session?.user?.token;

    if (!authToken) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    try {
      const response = await fetch(
        `/api/organizations/invite/${token}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        router.push("/dashboard");
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to accept invite");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);

    try {
      const response = await fetch(
        `/api/organizations/invite/${token}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        router.push("/");
      } else {
        const data = await response.json();
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to reject invite");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b3a62] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="bg-[#1A1A1A] rounded-2xl p-8 max-w-md w-full border border-gray-800 text-center">
          <div className="bg-red-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <IconX className="text-red-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-[#8b3a62] hover:bg-[#9d4572] text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] rounded-2xl p-8 max-w-md w-full border border-gray-800">
        <div className="text-center mb-8">
          <div className="bg-[#8b3a62]/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <IconBuilding className="text-[#8b3a62]" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Organization Invite</h1>
          <p className="text-gray-400">You've been invited to join an organization</p>
        </div>

        <div className="bg-[#2A2A2A] rounded-lg p-6 mb-6 space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Organization</label>
            <p className="text-white font-semibold text-lg">{invite.organization.name}</p>
            {invite.organization.description && (
              <p className="text-gray-400 text-sm mt-1">{invite.organization.description}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Invited by</label>
            <p className="text-white">{invite.inviter.name}</p>
            <p className="text-gray-400 text-sm">{invite.inviter.email}</p>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Your Role</label>
            <span className="inline-block bg-[#8b3a62]/20 text-[#8b3a62] px-3 py-1 rounded-full text-sm font-medium">
              {invite.role}
            </span>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleReject}
            disabled={processing}
            className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={processing}
            className="flex-1 bg-[#8b3a62] hover:bg-[#9d4572] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <IconCheck size={20} />
            {processing ? "Accepting..." : "Accept Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
