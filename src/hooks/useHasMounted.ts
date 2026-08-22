import { useState, useEffect } from "react";

/**
 * Hook to detect if the component has mounted on the client.
 * Useful for avoiding hydration mismatches when using client-only data (like persisted stores).
 */
export function useHasMounted() {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    return hasMounted;
}
