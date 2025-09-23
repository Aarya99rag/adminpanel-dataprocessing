"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const Sidebar = () => {
    const pathname = usePathname();

    const colors: Record<string, string> = {
        rasta360: "#FE6100", // orange
        nhai: "#034EA2", // blue
        msidc: "#088038", // green
    };

    const getActiveColor = () => {
        if (pathname.startsWith("/rasta360")) return colors.rasta360;
        if (pathname.startsWith("/nhai")) return colors.nhai;
        if (pathname.startsWith("/msidc")) return colors.msidc;
        return "#9e9e9e"; // default gray
    };

    const activeColor = getActiveColor();

    const links = [
        { href: "/rasta360", label: "Rasta.360" },
        { href: "/nhai", label: "NHAI" },
        { href: "/msidc", label: "MSIDC" },
    ];

    return (
        <div
            className="fixed top-0 left-0 h-screen w-[12vw] flex flex-col justify-center items-center 
                       rounded-r-4xl shadow-2xl p-8 space-y-10"
            style={{
                background: `linear-gradient(160deg, ${activeColor}30, #626262)`,
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderRight: `2px solid ${activeColor}55`,
                boxShadow: `4px 0 25px ${activeColor}33`,
            }}
        >
            <nav className="space-y-8 w-full">
                {links.map(({ href, label }) => {
                    const isActive = pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`relative block text-center text-lg tracking-wide font-semibold transition-all duration-300
                                ${
                                    isActive
                                        ? "scale-110"
                                        : "opacity-70 hover:opacity-100 hover:scale-105"
                                }`}
                            style={{
                                color: isActive ? activeColor : "#000",
                                // textShadow: isActive
                                //     ? `0 0 12px ${activeColor}88`
                                //     : "0 0 4px rgba(0,0,0,0.4)",
                            }}
                        >
                            {label}
                            {isActive && (
                                <span
                                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full"
                                    style={{
                                        background: `linear-gradient(${activeColor}, ${activeColor}55)`,
                                        boxShadow: `0 0 8px ${activeColor}aa`,
                                    }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default Sidebar;
