import React from "react";
import Vector1 from "@/public/Vector.png"
import Vector2 from "@/public/Vector_2.png"
import Vector3 from "@/public/Vector_3.png"
import Vector4 from "@/public/Vector_4.png"
import Image from "next/image";

const features = [
    {
        title: "Dynamic",
        subtitle: "Data Entry",
        description: "Generate adaptive forms instantly from your template.",
        icon: Vector1,
    },
    {
        title: "Built-in",
        subtitle: "Proofreading",
        description: "Fix grammar, tone, and tense with AI-powered suggestions.",
        icon: Vector2,
    },
    {
        title: "Secure",
        subtitle: "Letterhead",
        description: "Add official branding, lock with a PIN, and verify authenticity.",
        icon: Vector3,
    },
    {
        title: "Smart Template",
        subtitle: "Management",
        description: "our system detects placeholders and keeps every version synced automatically.",
        icon: Vector4,
    },
];

export function FeatureCards() {
    return (
        <div className="w-full bg-white px-4">
            <div className="container mx-auto max-w-5xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300"
                        >
                            {/* Header with Title and Icon */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-base font-semibold text-neutral-900 leading-tight">
                                        {feature.title}
                                    </h3>
                                    <h4 className="text-base font-semibold text-neutral-900 leading-tight">
                                        {feature.subtitle}
                                    </h4>
                                </div>
                                
                                {/* Icon Container */}
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3 ">
                                    <Image
                                        src={feature.icon}
                                        alt={feature.title}
                                        className="w-7 h-7"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-neutral-600 leading-relaxed">
                                {feature.description.includes("AI-powered") ? (
                                    <>
                                        Fix grammar, tone, and tense with{" "}
                                        <span className="text-[rgb(132,42,59)] font-semibold">
                                            AI-powered
                                        </span>{" "}
                                        suggestions.
                                    </>
                                ) : feature.description.includes("lock with") ? (
                                    <>
                                        Add official branding,{" "}
                                        <span className="text-[rgb(132,42,59)] font-semibold">
                                            lock with a PIN
                                        </span>
                                        , and verify authenticity.
                                    </>
                                ) : (
                                    feature.description
                                )}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}