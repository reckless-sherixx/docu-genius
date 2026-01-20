"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import {
    User,
    Mail,
    Building2,
    Shield,
    Key,
    Check,
    X,
    Loader2,
    Calendar,
    Crown,
    Users,
    Eye,
    EyeOff,
    Edit3,
    Save,
} from "lucide-react";
import Env from "@/lib/env";

interface Organization {
    id: string;
    name: string;
    description: string | null;
    role: "ADMIN" | "CREATOR";
    joinedAt: string;
}

interface UserProfile {
    id: string;
    name: string;
    email: string;
    hasPin: boolean;
    emailVerified: boolean;
    createdAt: string;
    organizations: Organization[];
}

export default function ProfilePage() {
    const { data: session } = useSession();
    const params = useParams();
    const organizationId = params?.organizationId as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // PIN states
    const [showPinSection, setShowPinSection] = useState(false);
    const [pin, setPin] = useState(["", "", "", ""]);
    const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
    const [pinError, setPinError] = useState<string | null>(null);
    const [pinSuccess, setPinSuccess] = useState(false);
    const [savingPin, setSavingPin] = useState(false);
    const [showPin, setShowPin] = useState(false);

    // Edit name states
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [savingName, setSavingName] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [session?.user?.token]);

    const fetchProfile = async () => {
        if (!session?.user?.token) return;

        try {
            setLoading(true);
            const response = await fetch(`${Env.BACKEND_URL}/api/auth/profile`, {
                headers: {
                    Authorization: `Bearer ${session.user.token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch profile");
            }

            const data = await response.json();
            setProfile(data.data);
            setEditedName(data.data.name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handlePinChange = (index: number, value: string, isPinConfirm = false) => {
        if (value.length > 1) return;
        if (value && !/^\d$/.test(value)) return;

        const newPin = isPinConfirm ? [...confirmPin] : [...pin];
        newPin[index] = value;

        if (isPinConfirm) {
            setConfirmPin(newPin);
        } else {
            setPin(newPin);
        }

        // Auto-focus next input
        if (value && index < 3) {
            const nextInput = document.getElementById(
                isPinConfirm ? `confirm-pin-${index + 1}` : `pin-${index + 1}`
            );
            nextInput?.focus();
        }
    };

    const handlePinKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number,
        isPinConfirm = false
    ) => {
        if (e.key === "Backspace" && !e.currentTarget.value && index > 0) {
            const prevInput = document.getElementById(
                isPinConfirm ? `confirm-pin-${index - 1}` : `pin-${index - 1}`
            );
            prevInput?.focus();
        }
    };

    const handleSavePin = async () => {
        setPinError(null);
        setPinSuccess(false);

        const pinValue = pin.join("");
        const confirmPinValue = confirmPin.join("");

        if (pinValue.length !== 4) {
            setPinError("Please enter a 4-digit PIN");
            return;
        }

        if (pinValue !== confirmPinValue) {
            setPinError("PINs do not match");
            return;
        }

        try {
            setSavingPin(true);
            const response = await fetch(`${Env.BACKEND_URL}/api/auth/profile/pin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.token}`,
                },
                body: JSON.stringify({ pin: parseInt(pinValue) }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to set PIN");
            }

            setPinSuccess(true);
            setProfile((prev) => (prev ? { ...prev, hasPin: true } : null));
            setShowPinSection(false);
            setPin(["", "", "", ""]);
            setConfirmPin(["", "", "", ""]);
        } catch (err) {
            setPinError(err instanceof Error ? err.message : "Failed to set PIN");
        } finally {
            setSavingPin(false);
        }
    };

    const handleSaveName = async () => {
        if (!editedName.trim()) return;

        try {
            setSavingName(true);
            const response = await fetch(`${Env.BACKEND_URL}/api/auth/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.token}`,
                },
                body: JSON.stringify({ name: editedName.trim() }),
            });

            if (!response.ok) {
                throw new Error("Failed to update name");
            }

            setProfile((prev) => (prev ? { ...prev, name: editedName.trim() } : null));
            setIsEditingName(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update name");
        } finally {
            setSavingName(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Header Skeleton */}
                <div className="mb-8">
                    <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-5 w-64 bg-gray-100 rounded animate-pulse mt-2" />
                </div>

                {/* Profile Card Skeleton */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Cover */}
                    <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />

                    {/* Profile Info */}
                    <div className="px-6 pb-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                            {/* Avatar Skeleton */}
                            <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                                <div className="w-full h-full rounded-full bg-gray-200 animate-pulse" />
                            </div>

                            {/* Name & Email Skeleton */}
                            <div className="flex-1 sm:mb-2">
                                <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                                <div className="h-5 w-56 bg-gray-100 rounded animate-pulse mt-2" />
                            </div>
                        </div>

                        {/* Stats Skeleton */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="text-center">
                                    <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
                                    <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mx-auto mt-2" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* PIN Section Skeleton */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                            <div>
                                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-1" />
                            </div>
                        </div>
                        <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                </div>

                {/* Organizations Section Skeleton */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
                                    <div>
                                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                                        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mt-1" />
                                    </div>
                                </div>
                                <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    const currentOrg = profile.organizations.find((org) => org.id === organizationId);

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Cover */}
                <div className="h-32 bg-gradient-to-r from-[rgb(132,42,59)] to-[rgb(162,62,79)]" />

                {/* Profile Info */}
                <div className="px-6 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[rgb(132,42,59)] to-[rgb(162,62,79)] flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">
                                    {getInitials(profile.name)}
                                </span>
                            </div>
                        </div>

                        {/* Name & Email */}
                        <div className="flex-1 sm:mb-2">
                            <div className="flex items-center gap-2">
                                {isEditingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editedName}
                                            onChange={(e) => setEditedName(e.target.value)}
                                            className="text-xl font-bold text-gray-900 border-b-2 border-[rgb(132,42,59)] focus:outline-none bg-transparent"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleSaveName}
                                            disabled={savingName}
                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                        >
                                            {savingName ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingName(false);
                                                setEditedName(profile.name);
                                            }}
                                            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                                        <button
                                            onClick={() => setIsEditingName(true)}
                                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 mt-1">
                                <Mail className="h-4 w-4" />
                                <span>{profile.email}</span>
                                {profile.emailVerified && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                        <Check className="h-3 w-3" />
                                        Verified
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {profile.organizations.length}
                            </div>
                            <div className="text-sm text-gray-500">Organizations</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {profile.hasPin ? (
                                    <Check className="h-6 w-6 text-green-500 mx-auto" />
                                ) : (
                                    <X className="h-6 w-6 text-red-400 mx-auto" />
                                )}
                            </div>
                            <div className="text-sm text-gray-500">PIN Set</div>
                        </div>
                        <div className="text-center col-span-2 sm:col-span-1">
                            <div className="flex items-center justify-center gap-1 text-gray-900">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div className="text-sm text-gray-500">
                                Joined {formatDate(profile.createdAt)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PIN Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[rgb(132,42,59)]/10 flex items-center justify-center">
                            <Key className="h-5 w-5 text-[rgb(132,42,59)]" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Document Generation PIN</h3>
                            <p className="text-sm text-gray-500">
                                {profile.hasPin
                                    ? "Your PIN is set for secure document generation"
                                    : "Set a 4-digit PIN to secure document generation"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPinSection(!showPinSection)}
                        className="px-4 py-2 text-sm font-medium text-[rgb(132,42,59)] hover:bg-[rgb(132,42,59)]/5 rounded-lg transition"
                    >
                        {profile.hasPin ? "Change PIN" : "Set PIN"}
                    </button>
                </div>

                {showPinSection && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="space-y-4">
                            {/* Enter PIN */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {profile.hasPin ? "New PIN" : "Enter PIN"}
                                </label>
                                <div className="flex gap-3">
                                    {pin.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`pin-${index}`}
                                            type={showPin ? "text" : "password"}
                                            value={digit}
                                            onChange={(e) => handlePinChange(index, e.target.value)}
                                            onKeyDown={(e) => handlePinKeyDown(e, index)}
                                            className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-[rgb(132,42,59)] focus:outline-none transition"
                                            maxLength={1}
                                        />
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setShowPin(!showPin)}
                                        className="ml-2 p-2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm PIN */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm PIN
                                </label>
                                <div className="flex gap-3">
                                    {confirmPin.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`confirm-pin-${index}`}
                                            type={showPin ? "text" : "password"}
                                            value={digit}
                                            onChange={(e) => handlePinChange(index, e.target.value, true)}
                                            onKeyDown={(e) => handlePinKeyDown(e, index, true)}
                                            className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-[rgb(132,42,59)] focus:outline-none transition"
                                            maxLength={1}
                                        />
                                    ))}
                                </div>
                            </div>

                            {pinError && (
                                <p className="text-sm text-red-500 flex items-center gap-1">
                                    <X className="h-4 w-4" />
                                    {pinError}
                                </p>
                            )}

                            {pinSuccess && (
                                <p className="text-sm text-green-500 flex items-center gap-1">
                                    <Check className="h-4 w-4" />
                                    PIN set successfully!
                                </p>
                            )}

                            <button
                                onClick={handleSavePin}
                                disabled={savingPin}
                                className="w-full py-2.5 bg-[rgb(132,42,59)] hover:bg-[rgb(112,32,49)] text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {savingPin ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="h-4 w-4" />
                                        Save PIN
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Organizations Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-[rgb(132,42,59)]/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-[rgb(132,42,59)]" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Your Organizations</h3>
                        <p className="text-sm text-gray-500">
                            Organizations you are a member of
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {profile.organizations.map((org) => (
                        <div
                            key={org.id}
                            className={`p-4 rounded-xl border-2 transition ${
                                org.id === organizationId
                                    ? "border-[rgb(132,42,59)] bg-[rgb(132,42,59)]/5"
                                    : "border-gray-100 hover:border-gray-200"
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[rgb(132,42,59)] to-[rgb(162,62,79)] flex items-center justify-center">
                                        <Building2 className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-gray-900">{org.name}</h4>
                                            {org.id === organizationId && (
                                                <span className="px-2 py-0.5 bg-[rgb(132,42,59)] text-white text-xs font-medium rounded-full">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        {org.description && (
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {org.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                                            org.role === "ADMIN"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-blue-100 text-blue-700"
                                        }`}
                                    >
                                        {org.role === "ADMIN" ? (
                                            <Crown className="h-3 w-3" />
                                        ) : (
                                            <Users className="h-3 w-3" />
                                        )}
                                        {org.role}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                                Joined {formatDate(org.joinedAt)}
                            </div>
                        </div>
                    ))}

                    {profile.organizations.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>You are not a member of any organization yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
