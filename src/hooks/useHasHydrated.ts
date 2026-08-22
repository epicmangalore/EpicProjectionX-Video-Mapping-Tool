"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/project-store";

/**
 * Hook to check if all necessary stores have hydrated from storage.
 */
export function useHasHydrated() {
    const projectHydrated = useProjectStore((state) => state._hasHydrated);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // If store is hydrated AND the component is mounted on the client
    return mounted && projectHydrated;
}
