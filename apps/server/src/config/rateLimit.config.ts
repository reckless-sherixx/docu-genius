import { rateLimit } from 'express-rate-limit'

export const appLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, 
	limit: 100, 
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	ipv6Subnet: 56,
})

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit:30,
    standardHeaders:"draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56,
})

export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56,
    message: {
        success: false,
        message: "Too many file uploads. Please try again after 15 minutes.",
    },
})

export const generateDocLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56,
    message: {
        success: false,
        message: "Too many document generations. Please try again after 15 minutes.",
    },
})

