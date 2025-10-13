import { NavbarButton } from '@/components/shared/NavbarComponents'
import React from 'react'
import { IconActivity } from '@tabler/icons-react'

export default function InsightSection() {
    return (
        <div className="w-full bg-neutral-50 py-20 px-4">
            <div className="container mx-auto max-w-6xl">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-12">
                    <NavbarButton variant="black" className="mb-6 flex items-center gap-2">
                        <IconActivity className="w-4 h-4" />
                        Live Oversight
                    </NavbarButton>

                    <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
                        Comprehensive Insights
                    </h2>

                    <p className="text-base md:text-lg text-neutral-600 max-w-3xl">
                        Keep track of every campaign and customer interaction to gain deeper insights and
                        thoughtfully refine your engagement strategies for better results.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Real-Time Insights Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100">
                        {/* Bar Chart */}
                        <div className="mb-8">
                            {/* Chart with border line */}
                            <div className="bg-white rounded-lg shadow-md p-5 border border-neutral-100 overflow-hidden">
                                <div className="mb-6">
                                    <div className="text-xs text-neutral-400 mb-1">Total Articles</div>
                                    <div className="text-xl font-bold text-neutral-900">15 Articles</div>
                                </div>

                                {/* Red dotted line at top */}
                                <div className="border-t-2 border-dashed border-[rgb(132,42,59)] mb-4"></div>

                                <div className="flex items-end justify-between gap-2" style={{ height: '13rem' }}>
                                    {[
                                        { month: 'Jan', height: '30%', color: 'bg-neutral-200' },
                                        { month: 'Feb', height: '45%', color: 'bg-neutral-200' },
                                        { month: 'Mar', height: '95%', color: 'bg-[rgb(132,42,59)]' },
                                        { month: 'Apr', height: '60%', color: 'bg-neutral-200' },
                                        { month: 'May', height: '20%', color: 'bg-neutral-200' },
                                        { month: 'Jun', height: '70%', color: 'bg-neutral-200' },
                                        { month: 'Jul', height: '50%', color: 'bg-neutral-200' },
                                        { month: 'Aug', height: '65%', color: 'bg-neutral-200' },
                                        { month: 'Sep', height: '55%', color: 'bg-neutral-200' },
                                    ].map((bar, index) => (
                                        <div key={index} className="flex flex-col items-center flex-1">
                                            <div className="relative mb-2 w-full max-w-[30px]" style={{ height: '13rem' }}>
                                                <div
                                                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-full rounded-t-md rounded-b-md ${bar.color} transition-all duration-300 hover:opacity-80`}
                                                    style={{ height: bar.height }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-neutral-400 whitespace-nowrap">{bar.month}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Title and Description */}
                        <div className="border-t border-neutral-100 pt-6 mt-4">
                            <h3 className="text-lg font-semibold text-[rgb(132,42,59)] mb-2">
                                Real-Time Insights
                            </h3>
                            <p className="text-sm text-neutral-600 leading-relaxed">
                                Monitor your campaigns in real time to <span className="text-[rgb(132,42,59)]">ensure maximum effectiveness</span> and identify areas for improvement.
                            </p>
                        </div>
                    </div>

                    {/* Actionable Data Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100">
                        {/* Area Chart */}
                        <div className="mb-8">
                            {/* Area Chart Visualization */}
                            <div className="bg-white rounded-lg shadow-md p-5 border border-neutral-100">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="text-xs text-neutral-400 mb-1">Statistics</div>
                                        <div className="text-base font-semibold text-neutral-900">Real-time customers</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-neutral-900">1,027</div>
                                        <div className="text-xs text-green-600 flex items-center justify-end gap-1 mt-1">
                                            <span>▲</span>
                                            <span className="font-semibold">12.75%</span>
                                        </div>
                                    </div>
                                </div>
                                <svg viewBox="0 0 400 160" className="w-full h-44">
                                    {/* Area fill */}
                                    <path
                                        d="M 0,130 L 40,125 L 80,115 L 120,120 L 160,75 L 200,85 L 240,70 L 280,95 L 320,105 L 360,95 L 400,100 L 400,160 L 0,160 Z"
                                        fill="url(#gradient)"
                                    />

                                    {/* Line */}
                                    <path
                                        d="M 0,130 L 40,125 L 80,115 L 120,120 L 160,75 L 200,85 L 240,70 L 280,95 L 320,105 L 360,95 L 400,100"
                                        stroke="rgb(132,42,59)"
                                        strokeWidth="2.5"
                                        fill="none"
                                    />

                                    {/* Vertical dotted line */}
                                    <line x1="200" y1="0" x2="200" y2="85" stroke="rgb(132,42,59)" strokeWidth="1" strokeDasharray="3,3" />

                                    {/* Dot marker */}
                                    <circle cx="200" cy="85" r="5" fill="rgb(132,42,59)" />
                                    <circle cx="200" cy="85" r="2.5" fill="white" />

                                    {/* Label above marker */}
                                    <text x="200" y="65" textAnchor="middle" fontSize="12" fill="rgb(132,42,59)" fontWeight="600">
                                        574
                                    </text>

                                    {/* Gradient definition */}
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="rgb(132,42,59)" stopOpacity="0.25" />
                                            <stop offset="100%" stopColor="rgb(255,255,255)" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                </svg>

                                {/* Time labels */}
                                <div className="flex justify-between text-xs text-neutral-400 mt-2">
                                    <span>10:00</span>
                                    <span>12:00</span>
                                    <span>14:00</span>
                                    <span>16:00</span>
                                    <span>18:00</span>
                                </div>
                            </div>
                        </div>

                        {/* Title and Description */}
                        <div className="border-t border-neutral-100 pt-6 mt-4">
                            <h3 className="text-lg font-semibold text-[rgb(132,42,59)] mb-2">
                                Actionable Data
                            </h3>
                            <p className="text-sm text-neutral-600 leading-relaxed">
                                Leverage analytics to <span className="text-[rgb(132,42,59)]">enhance workflows, boost engagement</span>, and make informed marketing decisions.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
