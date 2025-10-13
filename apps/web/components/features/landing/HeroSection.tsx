"use client";
import {
    Navbar,
    NavBody,
    NavItems,
    MobileNav,
    NavbarLogo,
    NavbarButton,
    MobileNavHeader,
    MobileNavToggle,
    MobileNavMenu,
} from "@/components/shared/NavbarComponents";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import CenterPiece from "@/public/centerpiece.png"
import { FeatureCards } from "./FeatureCards";
import { TypewriterEffectSmooth } from "./Typewriter-effect";
import InsightSection from "./InsightSection";
import PricingPlanSection from "./PricingPlanSection";

export function HeroSection() {
    const navItems = [
        {
            name: "Features",
            link: "#features",
        },
        {
            name: "Pricing",
            link: "#pricing",
        },
        {
            name: "Contact",
            link: "#contact",
        },
    ];

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="relative w-full">
            <Navbar>
                {/* Desktop Navigation */}
                <NavBody>
                    <NavbarLogo />
                    <NavItems items={navItems} />
                    <div className="flex items-center gap-4">
                        <NavbarButton variant="red">Get Started</NavbarButton>
                    </div>
                </NavBody>

                {/* Mobile Navigation */}
                <MobileNav>
                    <MobileNavHeader>
                        <NavbarLogo />
                        <MobileNavToggle
                            isOpen={isMobileMenuOpen}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        />
                    </MobileNavHeader>

                    <MobileNavMenu
                        isOpen={isMobileMenuOpen}
                        onClose={() => setIsMobileMenuOpen(false)}
                    >
                        {navItems.map((item, idx) => (
                            <a
                                key={`mobile-link-${idx}`}
                                href={item.link}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="relative text-neutral-600 dark:text-neutral-300"
                            >
                                <span className="block">{item.name}</span>
                            </a>
                        ))}
                        <div className="flex w-full flex-col gap-4">
                            <NavbarButton
                                onClick={() => setIsMobileMenuOpen(false)}
                                variant="red"
                                className="w-full"
                            >
                                Get Started
                            </NavbarButton>
                        </div>
                    </MobileNavMenu>
                </MobileNav>
            </Navbar>

            {/* Hero Section */}
            <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center justify-center text-center">
                <Image
                    src={CenterPiece}
                    alt="DocuGenius Logo"
                    width={100}
                    height={100}
                    className="mb-8"
                />

                {/* Heading */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 max-w-5xl text-neutral-900">
                    Build Your Ideas
                </h1>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 max-w-5xl text-neutral-900">
                    To Light With <TypewriterEffectSmooth words={[{ text: "DocuGenius" }]} />.
                </h2>

                {/* Subtitle */}
                <p className="text-lg md:text-xl text-neutral-600 mb-5 max-w-2xl">
                    Streamline your docs — one click to upload, proof, and generate.
                    <br />
                    Smart, fast, secure.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/register">
                        <NavbarButton variant="red">Get Started</NavbarButton>
                    </Link>
                    <Link href="/about">
                        <NavbarButton variant="black">Learn More</NavbarButton>
                    </Link>
                </div>
            </div>

            {/* Feature Cards Section */}
            <div>
                <FeatureCards />
            </div>
            
            {/* Insight Section */}
            <InsightSection />

            <PricingPlanSection/>

        </div>
    );
}
