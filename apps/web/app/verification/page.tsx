
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/DocuGeniusLogo.png";
import CenterPiece from "@/public/centerpiece.png";
import Env from "@/lib/env";
import {
    IconSearch,
    IconShieldCheck,
    IconShieldX,
    IconLoader2,
    IconFileText,
    IconCategory,
    IconUser,
    IconBuilding,
    IconCalendar,
    IconHash,
    IconArrowLeft,
} from "@tabler/icons-react";

const CATEGORY_LABELS: Record<string, string> = {
    GENERAL: "General",
    LEGAL: "Legal",
    FINANCE: "Finance",
    HR: "Human Resources",
    MARKETING: "Marketing",
    SALES: "Sales",
    OTHER: "Other",
};

type VerificationResult = {
    documentNumber: string;
    templateName: string;
    category: string;
    createdBy: string;
    organization: string;
    createdAt: string;
};

type VerificationState = "idle" | "loading" | "found" | "not-found" | "error";

export default function VerificationPage() {
    const [documentId, setDocumentId] = useState("");
    const [state, setState] = useState<VerificationState>("idle");
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    const handleVerify = async () => {
        const trimmed = documentId.trim();
        if (!trimmed) return;

        setState("loading");
        setResult(null);
        setErrorMessage("");

        try {
            // Strip # prefix if user included it, since it goes in the URL path
            const cleanId = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

            const response = await fetch(
                `${Env.BACKEND_URL}/verification/${encodeURIComponent(cleanId)}`,
                { method: "GET" }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                setResult(data.data);
                setState("found");
            } else if (response.status === 404) {
                setState("not-found");
            } else {
                setErrorMessage(data.message || "Something went wrong");
                setState("error");
            }
        } catch {
            setErrorMessage("Unable to connect. Please try again later.");
            setState("error");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleVerify();
    };

    const handleReset = () => {
        setState("idle");
        setDocumentId("");
        setResult(null);
        setErrorMessage("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
            {/* Header */}
            <header className="w-full border-b border-neutral-200/60 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto max-w-5xl flex items-center justify-between px-4 py-4">
                    <Link href="/" className="flex items-center gap-2.5">
                        <Image src={Logo} alt="DocuGenius" width={40} height={40} />
                        <span className="font-semibold text-lg text-neutral-900">
                            DocuGenius
                        </span>
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
                    >
                        <IconArrowLeft size={16} />
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto max-w-2xl px-4 py-16 md:py-24">
                {/* Branding */}
                <div className="flex flex-col items-center text-center mb-10">
                    <Image
                        src={CenterPiece}
                        alt="DocuGenius"
                        width={72}
                        height={72}
                        className="mb-6"
                    />
                    <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
                        Document Verification
                    </h1>
                    <p className="text-neutral-500 text-base max-w-md">
                        Enter a document ID to verify its authenticity and view its details.
                    </p>
                </div>

                {/* Search Card */}
                <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-6 md:p-8">
                    {/* Input */}
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <IconHash
                                size={18}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                            />
                            <input
                                type="text"
                                value={documentId}
                                onChange={(e) => setDocumentId(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="DOC-0001"
                                className="w-full h-12 pl-10 pr-4 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[rgb(132,42,59)] focus:ring-2 focus:ring-[rgb(132,42,59)]/10 transition-all"
                                disabled={state === "loading"}
                            />
                        </div>
                        <button
                            onClick={handleVerify}
                            disabled={!documentId.trim() || state === "loading"}
                            className="h-12 px-6 rounded-xl text-sm font-medium text-white bg-[rgb(132,42,59)] hover:bg-[rgb(112,32,49)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0"
                        >
                            {state === "loading" ? (
                                <IconLoader2 size={18} className="animate-spin" />
                            ) : (
                                <IconSearch size={18} />
                            )}
                            Verify
                        </button>
                    </div>

                    {/* Results */}
                    {state === "found" && result && (
                        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Success Banner */}
                            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/60 rounded-xl px-4 py-3 mb-5">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <IconShieldCheck
                                        size={20}
                                        className="text-emerald-600"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-emerald-800">
                                        Document Verified
                                    </p>
                                    <p className="text-xs text-emerald-600">
                                        This document is authentic and exists in our system.
                                    </p>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <DetailItem
                                    icon={<IconHash size={16} />}
                                    label="Document Number"
                                    value={result.documentNumber}
                                />
                                <DetailItem
                                    icon={<IconFileText size={16} />}
                                    label="Template"
                                    value={result.templateName}
                                />
                                <DetailItem
                                    icon={<IconCategory size={16} />}
                                    label="Category"
                                    value={CATEGORY_LABELS[result.category] || result.category}
                                />
                                <DetailItem
                                    icon={<IconUser size={16} />}
                                    label="Created By"
                                    value={result.createdBy}
                                />
                                <DetailItem
                                    icon={<IconBuilding size={16} />}
                                    label="Organization"
                                    value={result.organization}
                                />
                                <DetailItem
                                    icon={<IconCalendar size={16} />}
                                    label="Created On"
                                    value={new Date(result.createdAt).toLocaleDateString(
                                        "en-US",
                                        {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        }
                                    )}
                                />
                            </div>

                            {/* Reset */}
                            <button
                                onClick={handleReset}
                                className="mt-5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors underline underline-offset-2"
                            >
                                Verify another document
                            </button>
                        </div>
                    )}

                    {state === "not-found" && (
                        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-3 bg-red-50 border border-red-200/60 rounded-xl px-4 py-3">
                                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                    <IconShieldX size={20} className="text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-red-800">
                                        Document Not Found
                                    </p>
                                    <p className="text-xs text-red-600">
                                        No document matches this ID. Please double-check and try
                                        again.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleReset}
                                className="mt-4 text-sm text-neutral-500 hover:text-neutral-800 transition-colors underline underline-offset-2"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {state === "error" && (
                        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3">
                                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                    <IconShieldX size={20} className="text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-amber-800">
                                        Verification Error
                                    </p>
                                    <p className="text-xs text-amber-600">{errorMessage}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleReset}
                                className="mt-4 text-sm text-neutral-500 hover:text-neutral-800 transition-colors underline underline-offset-2"
                            >
                                Try again
                            </button>
                        </div>
                    )}
                </div>

                {/* Help Text */}
                <p className="text-center text-xs text-neutral-400 mt-6">
                    Document IDs follow the format{" "}
                    <span className="font-mono text-neutral-500">#DOC-XXXX</span>. You
                    can find it on the generated document.
                </p>
            </main>
        </div>
    );
}

function DetailItem({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3 bg-neutral-50 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200/60 flex items-center justify-center shrink-0 text-neutral-500 mt-0.5">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-neutral-400 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-neutral-800 truncate">{value}</p>
            </div>
        </div>
    );
}
