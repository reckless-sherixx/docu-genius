"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconBuildingCommunity, IconKey, IconPlus } from "@tabler/icons-react";
import { useSession } from "next-auth/react";

export function OnboardingPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [activeTab, setActiveTab] = useState<"create" | "join">("create");
    const [loading, setLoading] = useState(false);

    // Create organization states
    const [orgName, setOrgName] = useState("");
    const [orgDescription, setOrgDescription] = useState("");

    // Join organization state
    const [orgPin, setOrgPin] = useState("");

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = session?.user?.token;
            if (!token) {
                alert("Please login first");
                router.push("/login");
                return;
            }

            const response = await fetch("/api/organizations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: orgName, description: orgDescription }),
            });

            const data = await response.json();

            if (response.ok) {
                router.push("/dashboard");
            } else {
                alert(data.message || "Failed to create organization");
            }
        } catch (error) {
            console.error("Error creating organization:", error);
            alert("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = session?.user?.token;
            if (!token) {
                alert("Please login first");
                router.push("/login");
                return;
            }

            const response = await fetch("/api/organizations/join", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ pin: orgPin }),
            });

            const data = await response.json();

            if (response.ok) {
                router.push("/dashboard");
            } else {
                alert(data.message || "Failed to join organization");
            }
        } catch (error) {
            console.error("Error joining organization:", error);
            alert("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        router.push("/dashboard");
    };

    // Show loading while session is loading
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(132,42,59)] mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-[rgb(48,48,48)] mb-3">
                        Welcome to DocuGenius
                    </h1>
                    <p className="text-gray-600 text-sm md:text-base">
                        Create or join an organization to get started
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-200">
                    {/* Tabs */}
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => setActiveTab("create")}
                            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${activeTab === "create"
                                    ? "bg-[rgb(132,42,59)] text-white"
                                    : "bg-white text-gray-600 hover:text-[rgb(48,48,48)] border border-gray-300"
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <IconPlus size={20} />
                                <span>Create Organization</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab("join")}
                            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${activeTab === "join"
                                    ? "bg-[rgb(132,42,59)] text-white"
                                    : "bg-white text-gray-600 hover:text-[rgb(48,48,48)] border border-gray-300"
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <IconBuildingCommunity size={20} />
                                <span>Join Organization</span>
                            </div>
                        </button>
                    </div>

                    {/* Create Organization Form */}
                    {activeTab === "create" && (
                        <form onSubmit={handleCreateOrganization} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    placeholder="Enter organization name"
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-[rgb(48,48,48)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={orgDescription}
                                    onChange={(e) => setOrgDescription(e.target.value)}
                                    placeholder="Enter organization description"
                                    rows={4}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-[rgb(48,48,48)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent resize-none"
                                />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-sm text-gray-600">
                                    <strong className="text-[rgb(48,48,48)]">Note:</strong> You will be the owner of this
                                    organization and will receive a unique PIN to share with team members.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[rgb(132,42,59)] hover:bg-[rgb(152,52,69)] text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Creating..." : "Create Organization"}
                            </button>
                        </form>
                    )}

                    {/* Join Organization Form */}
                    {activeTab === "join" && (
                        <form onSubmit={handleJoinOrganization} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Organization PIN
                                </label>
                                <div className="relative">
                                    <IconKey
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={20}
                                    />
                                    <input
                                        type="text"
                                        value={orgPin}
                                        onChange={(e) => setOrgPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        placeholder="Enter 6-digit PIN"
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-[rgb(48,48,48)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent text-lg tracking-widest"
                                        required
                                        maxLength={6}
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-sm text-gray-600">
                                    <strong className="text-[rgb(48,48,48)]">Need a PIN?</strong> Ask your organization owner
                                    or admin to share the 6-digit organization PIN with you.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || orgPin.length !== 6}
                                className="w-full bg-[rgb(132,42,59)] hover:bg-[rgb(152,52,69)] text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Joining..." : "Join Organization"}
                            </button>
                        </form>
                    )}

                    {/* Skip Button */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={handleSkip}
                            className="text-gray-500 hover:text-[rgb(48,48,48)] text-sm font-medium transition-colors"
                        >
                            I'll do this later
                        </button>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid md:grid-cols-2 gap-4 mt-8">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-[rgb(48,48,48)] font-medium mb-2">Creating an Organization</h3>
                        <p className="text-gray-600 text-sm">
                            As the owner, you'll get a unique PIN to share with your team members. You can also
                            invite members via email.
                        </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-[rgb(48,48,48)] font-medium mb-2">Joining an Organization</h3>
                        <p className="text-gray-600 text-sm">
                            Use the 6-digit PIN shared by your organization owner to join instantly. Or wait for
                            an email invitation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
