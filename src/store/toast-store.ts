import { create } from "zustand";
import { generateId } from "@/lib/utils";

export interface Toast {
    id: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
    duration?: number;
}

interface ToastStore {
    toasts: Toast[];
    addToast: (message: string, type?: Toast["type"], duration?: number) => void;
    removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (message, type = "info", duration = 3000) => {
        const id = generateId();
        set((state) => ({
            toasts: [...state.toasts, { id, message, type, duration }],
        }));

        if (duration !== Infinity) {
            setTimeout(() => {
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== id),
                }));
            }, duration);
        }
    },
    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
}));

export const toast = {
    success: (msg: string, dur?: number) => useToastStore.getState().addToast(msg, "success", dur),
    error: (msg: string, dur?: number) => useToastStore.getState().addToast(msg, "error", dur),
    info: (msg: string, dur?: number) => useToastStore.getState().addToast(msg, "info", dur),
    warning: (msg: string, dur?: number) => useToastStore.getState().addToast(msg, "warning", dur),
};
