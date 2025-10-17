import { LOGIN_URL } from "@/lib/api-endpoints"
import axios from "axios"
import { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: AuthOptions = {
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            return true
        },
        async redirect({ url, baseUrl }) {
            return baseUrl
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
                const user = data?.data;
                if (user) {
                    return user
                } else {
                    return null
                }
            }
        })
    ],
}