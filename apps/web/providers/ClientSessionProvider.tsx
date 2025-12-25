"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

interface Props {
    children?: React.ReactNode;
}

export default function ClientSessionProvider({ children }: Props) {
    return (
        <SessionProvider 
            refetchInterval={0} 
            refetchOnWindowFocus={false}
        >
            {children}
        </SessionProvider>
    );
}