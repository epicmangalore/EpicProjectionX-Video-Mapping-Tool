import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
});

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#0a0a0f",
};

export const metadata: Metadata = {
    title: "ProjectX by EPIC - Web-Based Projection Mapping",
    description: "Full-featured projection mapping application as a Progressive Web App",
    manifest: "/manifest.json",
};

import { ToastContainer } from "@/components/ui/Toast";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body
                className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
            >
                {children}
                <ToastContainer />
            </body>
        </html>
    );
}
