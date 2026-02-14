import { create } from "zustand";

type ModalType = "confirm" | "prompt";

interface ModalOptions {
    title?: string;
    message: string;
    defaultValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: (value?: string) => void;
    onCancel?: () => void;
}

interface ModalState {
    activeModal: (ModalOptions & { type: ModalType }) | null;
    confirm: (options: Omit<ModalOptions, "onConfirm" | "onCancel">) => Promise<boolean>;
    prompt: (options: Omit<ModalOptions, "onConfirm" | "onCancel">) => Promise<string | null>;
    closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
    activeModal: null,

    confirm: (options) => {
        return new Promise((resolve) => {
            set({
                activeModal: {
                    ...options,
                    type: "confirm",
                    onConfirm: () => {
                        set({ activeModal: null });
                        resolve(true);
                    },
                    onCancel: () => {
                        set({ activeModal: null });
                        resolve(false);
                    },
                },
            });
        });
    },

    prompt: (options) => {
        return new Promise((resolve) => {
            set({
                activeModal: {
                    ...options,
                    type: "prompt",
                    onConfirm: (value) => {
                        set({ activeModal: null });
                        resolve(value || null);
                    },
                    onCancel: () => {
                        set({ activeModal: null });
                        resolve(null);
                    },
                },
            });
        });
    },

    closeModal: () => set({ activeModal: null }),
}));
