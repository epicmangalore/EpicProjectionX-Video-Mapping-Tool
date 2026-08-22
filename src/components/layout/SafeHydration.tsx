"use client";

import { useHasHydrated } from "@/hooks/useHasHydrated";
import React from "react";

interface SafeHydrationProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Wrapper component to prevent hydration mismatches by only rendering 
 * children after the client has fully hydrated all stores.
 */
export function SafeHydration({ children, fallback = null }: SafeHydrationProps) {
    const hydrated = useHasHydrated();

    if (!hydrated) {
        return (
            <>
                {fallback}
                {/* 
                  During hydration, we might want to render a skeleton or just nothing.
                  Rendering nothing is the safest way to avoid mismatches.
                */}
            </>
        );
    }

    return <>{children}</>;
}
