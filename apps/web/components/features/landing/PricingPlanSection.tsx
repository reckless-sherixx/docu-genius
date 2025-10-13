"use client";
import React, { useState } from 'react'
import { IconCheck, IconPackage, IconRocket } from '@tabler/icons-react'
import { NavbarButton } from '@/components/shared/NavbarComponents';

export default function PricingPlanSection() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const plans = [
        {
            name: 'Free',
            label: 'Freemium',
            monthlyPrice: 0,
            yearlyPrice: 0,
            icon: IconPackage,
            buttonText: 'Get Started',
            buttonVariant: 'black' as const,
            description: 'Test the Core Engine & Document Speed',
            features: [
                'Single User Account',
                'Basic document generation and PDF upload/ validation (up to 10 MB)',
                'Dynamic Form Generation from detected placeholders',
                'Basic proofreading for grammar and spelling',
            ],
            isPopular: false,
            bgColor: 'bg-white',
            textColor: 'text-neutral-900',
        },
        {
            name: 'Starter',
            label: 'Starter',
            monthlyPrice: 35,
            yearlyPrice: 350,
            icon: IconPackage,
            buttonText: 'Get Started',
            buttonVariant: 'primary' as const,
            description: 'Speed, Consistency, and Error Reduction for Small Teams',
            features: [
                'All features in Free, PLUS:',
                'Multiple User Accounts',
                'Up to 100 final, unwatermarked documents per month',
                'Full Brand Control: Automatic application of corporate letterhead and serial numbering',
                'Security: User PIN Authentication before final generation',
                'Basic Audit Log tracking of personal document generations',
            ],
            isPopular: true,
            bgColor: 'bg-[rgb(132,42,59)]',
            textColor: 'text-white',
        },
        {
            name: 'Premium',
            label: 'Premium',
            monthlyPrice: 99,
            yearlyPrice: 990,
            icon: IconPackage,
            buttonText: 'Get Started',
            buttonVariant: 'black' as const,
            description: 'Full Auditability, Compliance, and Advanced Language Control',
            features: [
                'All features in Basic, PLUS:',
                'Increased limits',
                'Comprehensive Audit Log via Admin Panel with filtering',
                'Template Version Control',
                'Multi-Dialect Support (US, UK, Australian) for region-specific rules',
                'Change Tracking and export of before/after comparison reports for compliance',
                'Document Invalidation API access to change a document\'s status to "invalid"',
                'Dedicated infrastructure options (multi-region deployment or VPC)',
            ],
            isPopular: false,
            bgColor: 'bg-white',
            textColor: 'text-neutral-900',
        },
    ];

    const getDisplayPrice = (plan: typeof plans[0]) => {
        if (plan.monthlyPrice === 0) return 'Free';
        const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
        return `$${price}`;
    };

    const getPeriod = () => {
        return billingCycle === 'monthly' ? 'user/month' : 'user/year';
    };

    return (
        <div className="w-full bg-neutral-50 py-20 px-4">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
                        Flexible Plans For All
                    </h2>

                    <p className="text-base md:text-lg text-neutral-600 max-w-2xl mb-8">
                        Select a Plan that aligns with your goals and easily scale it to support your growth over time.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center gap-3 bg-white rounded-full p-1 shadow-sm border border-neutral-200">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'monthly'
                                ? 'bg-neutral-200 text-neutral-900'
                                : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'yearly'
                                ? 'bg-neutral-200 text-neutral-900'
                                : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            Yearly
                        </button>
                        <div className="bg-[rgb(48,48,48)] text-white text-xs font-semibold px-3 py-1 rounded-full">
                            Save 17%
                        </div>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`${plan.bgColor} ${plan.textColor} rounded-2xl p-6 shadow-md border ${plan.isPopular ? 'border-[rgb(132,42,59)]' : 'border-neutral-200'
                                } relative transition-all duration-300 hover:shadow-xl ${plan.isPopular ? 'lg:scale-105' : ''
                                }`}
                        >
                            {/* Popular Badge */}
                            {plan.isPopular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <div className="bg-white text-[rgb(132,42,59)] text-xs font-bold px-4 py-1 rounded-full border-2 border-[rgb(132,42,59)]">
                                        MOST POPULAR
                                    </div>
                                </div>
                            )}

                            {/* Icon and Price */}
                            <div className="flex items-start justify-between mb-6">
                                <div className={`w-14 h-14 rounded-xl ${plan.isPopular ? 'bg-white' : 'bg-neutral-100'} flex items-center justify-center transition-all duration-300`}>
                                    <plan.icon className={`w-7 h-7 ${plan.isPopular ? 'text-[rgb(132,42,59)]' : 'text-neutral-900'}`} strokeWidth={1.5} />
                                </div>
                                <div className="text-right">
                                    <div className={`text-xs font-medium mb-1 ${plan.isPopular ? 'text-white/80' : 'text-neutral-500'} transition-colors duration-300`}>
                                        {plan.label}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold transition-all duration-300">{getDisplayPrice(plan)}</span>
                                        <span className={`text-xs ${plan.isPopular ? 'text-white/80' : 'text-neutral-500'} transition-all duration-300`}>
                                            {getPeriod()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* CTA Button */}
                            <NavbarButton
                                variant={plan.isPopular ? 'primary' : plan.buttonVariant}
                                className="w-full mb-5 flex items-center justify-center gap-2 text-sm"
                            >
                                <IconRocket className="w-4 h-4" />
                                {plan.buttonText}
                            </NavbarButton>

                            {/* Description */}
                            <h3 className={`text-xs font-semibold mb-4 ${plan.isPopular ? 'text-white' : 'text-neutral-900'}`}>
                                {plan.description}
                            </h3>

                            {/* Features */}
                            <ul className="space-y-2.5">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <IconCheck
                                            className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${plan.isPopular ? 'text-white' : 'text-green-600'}`}
                                            strokeWidth={2.5}
                                        />
                                        <span className={`text-[11px] leading-relaxed ${plan.isPopular ? 'text-white/90' : 'text-neutral-600'}`}>
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>


                {/* Dashed Line */}
                <div className="relative mt-16">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-dashed border-[rgb(132,42,59)]"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-neutral-50 px-4 text-sm font-medium text-[rgb(132,42,59)]">
                            Finish Documents in no time
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}