import React from 'react'
import { IconBrandLinkedin, IconBrandX, IconBrandFacebook, IconTarget } from '@tabler/icons-react'
import { NavbarButton } from '@/components/shared/NavbarComponents'
import Image from 'next/image'
import Link from 'next/link'
import Logo from "@/public/DocuGeniusLogo.png"

export default function FooterSection() {
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Contact', href: '#contact' },
    { name: 'Terms & Condition', href: '/terms' },
    { name: 'Blogs', href: '/blogs' },
    { name: 'Privacy & Policy', href: '/privacy' },
  ]

  const socialLinks = [
    { icon: IconBrandLinkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
    { icon: IconTarget, href: 'https://behance.net', label: 'Behance' },
    { icon: IconBrandX, href: 'https://x.com', label: 'X' },
    { icon: IconBrandFacebook, href: 'https://facebook.com', label: 'Facebook' },
  ]

  return (
    <footer className="w-full bg-neutral-50 border-t border-neutral-200">
      <div className="container mx-auto max-w-7xl px-4 ">
        {/* Top Section - CTA */}
        <div className="bg-white rounded-3xl p-10 mb-16 shadow-sm border border-neutral-100 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-neutral-100 text-neutral-700 text-xs font-medium px-4 py-2 rounded-full mb-4">
                <IconTarget className="w-4 h-4" />
                Built With Precision
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
                BuildWithDocuGenius
                <br />
                FinishWith Impact.
              </h2>
              <p className="text-neutral-600 text-sm mb-6 max-w-lg">
                Streamline Document generation and customer demand with automation, tailored for diverse sda dynamic real-world environments.
              </p>
              <div className="flex flex-wrap gap-4">
                <NavbarButton variant="red">Get Started</NavbarButton>
                <NavbarButton variant="black">Learn More</NavbarButton>
              </div>
            </div>

            {/* Right Content - Mini Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-neutral-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs text-neutral-400 mb-1">Statistics</div>
                  <div className="text-sm font-semibold text-neutral-900">Real-time customers</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-neutral-900">1,027</div>
                  <div className="text-xs text-green-600 flex items-center justify-end gap-1 mt-1">
                    <span>▲</span>
                    <span className="font-semibold">12.75%</span>
                  </div>
                </div>
              </div>
              
              {/* Mini Chart */}
              <svg viewBox="0 0 400 140" className="w-full h-32">
                <path
                  d="M 0,110 L 40,105 L 80,95 L 120,100 L 160,65 L 200,75 L 240,60 L 280,85 L 320,95 L 360,85 L 400,90 L 400,140 L 0,140 Z"
                  fill="url(#footerGradient)"
                />
                <path
                  d="M 0,110 L 40,105 L 80,95 L 120,100 L 160,65 L 200,75 L 240,60 L 280,85 L 320,95 L 360,85 L 400,90"
                  stroke="rgb(132,42,59)"
                  strokeWidth="2.5"
                  fill="none"
                />
                <line x1="160" y1="0" x2="160" y2="65" stroke="rgb(132,42,59)" strokeWidth="1" strokeDasharray="3,3" />
                <circle cx="160" cy="65" r="4" fill="rgb(132,42,59)" />
                <circle cx="160" cy="65" r="2" fill="white" />
                <text x="160" y="50" textAnchor="middle" fontSize="11" fill="rgb(132,42,59)" fontWeight="600">574</text>
                <defs>
                  <linearGradient id="footerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(132,42,59)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="rgb(255,255,255)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                <span>10:00</span>
                <span>12:00</span>
                <span>14:00</span>
                <span>16:00</span>
                <span>18:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section - Logo and Links */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 pb-8 border-b border-neutral-200">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src={Logo} alt="DocuGenius Logo" width={40} height={40} />
            <span className="text-xl font-semibold text-neutral-900">DocuGenius</span>
          </div>

          {/* Footer Links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {footerLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-white hover:bg-[rgb(132,42,59)] transition-colors"
              >
                <social.icon className="w-5 h-5" strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>

        {/* Bottom Section - Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-neutral-600 mb-7">
          <p>©{currentYear} DocuGenius. All rights reserved.</p>
          <p>
            Designed by: <span className="font-medium text-neutral-900">4bhimxnyu</span>
          </p>
          <p>
            Built by: <span className="font-medium text-neutral-900">Vidyansh</span>
          </p>
          <p>
            <a href="mailto:hello@DocuGenius.co" className="hover:text-neutral-900 transition-colors">
              hello@DocuGenius.co
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
