import { LOGIN_URL } from "@/lib/api-endpoints"
import axios from "axios"
import { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: AuthOptions = {
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, 
    },
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            return true
        },
        async redirect({ url, baseUrl }) {
            // If the url is just the base, redirect to dashboard
            if (url === baseUrl || url === `${baseUrl}/`) {
                return `${baseUrl}/dashboard`;
            }
            // If url starts with baseUrl, allow it
            if (url.startsWith(baseUrl)) {
                return url;
            }
            // Default to dashboard
            return `${baseUrl}/dashboard`;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub || token.id as string;
                session.user.token = token.token as string;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.token = user.token;
            }
            return token
        },
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: {},
                password: {}
            },
            async authorize(credentials, req) {
                const { data } = await axios.post(LOGIN_URL, credentials)
                const result = data?.data;
                if (result && result.user && result.token) {
                    // Return user with token attached
                    return {
                        ...result.user,
                        token: result.token
                    }
                } else {
                    return null
                }
            }
        })
    ],
}