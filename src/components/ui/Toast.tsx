"use client";

import React from "react";
import { useToastStore } from "@/store/toast-store";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

const ICONS = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    info: <Info className="w-4 h-4 text-blue-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
};

const BORDERS = {
    success: "border-emerald-500/20 bg-emerald-500/5",
    error: "border-red-500/20 bg-red-500/5",
    info: "border-blue-500/20 bg-blue-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
};

export function ToastContainer() {
    const toasts = useToastStore((state) => state.toasts);
    const removeToast = useToastStore((state) => state.removeToast);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        pointer-events-auto min-w-[300px] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl
                        animate-in fade-in slide-in-from-bottom-5 duration-300
                        ${BORDERS[toast.type]}
                    `}
                >
                    <div className="shrink-0">{ICONS[toast.type]}</div>
                    <div className="flex-1 text-sm font-medium text-zinc-100">{toast.message}</div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
