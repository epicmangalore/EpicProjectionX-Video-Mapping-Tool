import { StateStorage } from "zustand/middleware";
import { db, dbReady } from "@/lib/db";

export const idbStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (typeof window === 'undefined') return null;
        await dbReady;
        try {
            const entry = await db.settings.get(name);
            return entry?.value || null;
        } catch (error) {
            console.error("IDB getItem error:", error);
            return null;
        }
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (typeof window === 'undefined') return;
        await dbReady;
        try {
            await db.settings.put({ key: name, value });
        } catch (error: unknown) {
            console.error("IDB setItem error:", error);
            // If table missing, it might be a schema sync issue.
            // In dev, we can try to re-open or just log.
            if ((error as { name?: string }).name === 'NotFoundError') {
                console.warn("Table 'settings' not found. You may need to reload or clear site data.");
            }
        }
    },
    removeItem: async (name: string): Promise<void> => {
        if (typeof window === 'undefined') return;
        await dbReady;
        try {
            await db.settings.delete(name);
        } catch (error) {
            console.error("IDB removeItem error:", error);
        }
    },
};
