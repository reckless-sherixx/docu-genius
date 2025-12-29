"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useOrganizationId } from "@/hooks/use-organization-id";
import { Loader2, Shield, User as UserIcon, Mail, Calendar, Crown, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { toast } from "sonner";

interface Member {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CREATOR";
  joined_at: string;
  user_created_at: string;
}

const getTimeAgo = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "today";
  if (diffInDays === 1) return "yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
};

export function MembersComponent() {
  const { data: session } = useSession();
  const organizationId = useOrganizationId();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"ADMIN" | "CREATOR" | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!session?.user?.token || !organizationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/v1/organization/${organizationId}/members`,
          {
            headers: {
              'Authorization': `Bearer ${session.user.token}`,
            },
            cache: 'no-store',
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setMembers(data.data);
            // Find current user in the members list
            const currentMember = data.data.find((m: Member) => m.email === session.user?.email);
            if (currentMember) {
              setCurrentUserId(currentMember.user_id);
              setCurrentUserRole(currentMember.role);
            }
          }
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to fetch members');
        }
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [session?.user?.token, session?.user?.email, organizationId]);

  const handleRoleChange = async (memberId: string, newRole: "ADMIN" | "CREATOR") => {
    if (!session?.user?.token || !organizationId) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/v1/organization/${organizationId}/members/${memberId}/role`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.user.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: newRole }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Role updated successfully');
        // Update local state
        setMembers(prevMembers =>
          prevMembers.map(member =>
            member.user_id === memberId ? { ...member, role: newRole } : member
          )
        );
      } else {
        toast.error(data.message || 'Failed to update role');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!session?.user?.token || !organizationId) return;

    if (!confirm(`Are you sure you want to remove ${memberName} from this organization?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/v1/organization/${organizationId}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.user.token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Member removed successfully');
        // Remove from local state
        setMembers(prevMembers => prevMembers.filter(member => member.user_id !== memberId));
      } else {
        toast.error(data.message || 'Failed to remove member');
      }
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[rgb(132,42,59)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-red-500 mb-2">⚠️ {error}</div>
        <p className="text-gray-500 text-sm">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Members</h1>
        <p className="text-gray-600">
          {members.length} {members.length === 1 ? 'member' : 'members'} in this organization
        </p>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => {
          const isCurrentUser = member.user_id === currentUserId;
          const canManage = currentUserRole === "ADMIN" && !isCurrentUser;

          return (
            <div
              key={member.id}
              className="bg-white rounded-lg border border-gray-200 hover:border-[rgb(132,42,59)] hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              {/* Card Header with Role Badge */}
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-6 pb-4">
                {/* Three-dot menu */}
                {canManage && (
                  <div className="absolute top-4 left-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-gray-200 transition-colors">
                          <MoreVertical className="h-5 w-5 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.user_id, "ADMIN")}
                          disabled={member.role === "ADMIN"}
                          className="cursor-pointer"
                        >
                          Set as Administrator
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.user_id, "CREATOR")}
                          disabled={member.role === "CREATOR"}
                          className="cursor-pointer"
                        >
                          Set as Creator
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.user_id, member.name)}
                          className="cursor-pointer text-[rgb(132,42,59)] focus:text-[rgb(132,42,59)] focus:bg-red-50"
                        >
                          Remove {member.name}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <div className="absolute top-4 right-4">
                  {member.role === "ADMIN" ? (
                    <div className="flex items-center gap-1.5 bg-[rgb(132,42,59)] text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                      <Crown className="h-3.5 w-3.5" />
                      <span>Admin</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                      <Shield className="h-3.5 w-3.5" />
                      <span>Creator</span>
                    </div>
                  )}
                </div>

                {/* Avatar */}
                <div className="flex items-center justify-center mb-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[rgb(132,42,59)] to-[rgb(139,42,52)] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-center text-lg font-semibold text-gray-900 mb-1">
                  {member.name}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-gray-500">(You)</span>
                  )}
                </h3>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-3">
                {/* Email */}
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 break-all">{member.email}</span>
                </div>

                {/* Joined Date */}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">
                    Joined {getTimeAgo(member.joined_at)}
                  </span>
                </div>

                {/* Member Since */}
                <div className="flex items-center gap-3 text-sm">
                  <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 text-xs">
                    Member since {new Date(member.user_created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short'
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {members.length === 0 && (
        <div className="text-center py-12">
          <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-500">This organization doesn't have any members yet.</p>
        </div>
      )}
    </div>
  );
}
