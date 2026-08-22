"use client";

import React, { useState, useEffect, useRef } from "react";
import { useModalStore } from "@/store/modal-store";
import { AlertCircle, HelpCircle, X } from "lucide-react";

export function GlobalModal() {
    const { activeModal, closeModal } = useModalStore();
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeModal?.type === "prompt") {
            setInputValue(activeModal.defaultValue || "");
            // Focus input on next tick
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [activeModal]);

    if (!activeModal) return null;

    const handleConfirm = () => {
        if (activeModal.type === "prompt") {
            activeModal.onConfirm(inputValue);
        } else {
            activeModal.onConfirm();
        }
    };

    const handleCancel = () => {
        if (activeModal.onCancel) {
            activeModal.onCancel();
        } else {
            closeModal();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleConfirm();
        if (e.key === "Escape") handleCancel();
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={handleCancel}
            />

            {/* Modal Card */}
            <div
                className="relative w-full max-w-md glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300"
                onKeyDown={handleKeyDown}
            >
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg">
                            {activeModal.type === "confirm" ? (
                                <HelpCircle className="w-5 h-5 text-electric-cyan" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-electric-cyan" />
                            )}
                        </div>
                        <h3 className="text-lg font-semibold text-white">
                            {activeModal.title || (activeModal.type === "confirm" ? "Confirm Action" : "Input Required")}
                        </h3>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6 font-medium text-zinc-300">
                    <p className="leading-relaxed mb-4">{activeModal.message}</p>

                    {activeModal.type === "prompt" && (
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-electric-cyan/50 focus:ring-1 focus:ring-electric-cyan/50 transition-all font-sans text-sm"
                                placeholder="Type here..."
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white/5 flex items-center justify-end gap-3">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                        {activeModal.cancelLabel || "Cancel"}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 text-sm font-bold bg-white text-black hover:bg-electric-cyan hover:text-black rounded-xl transition-all shadow-lg hover:shadow-electric-cyan/20"
                    >
                        {activeModal.confirmLabel || (activeModal.type === "confirm" ? "Confirm" : "Submit")}
                    </button>
                </div>
            </div>
        </div>
    );
}
