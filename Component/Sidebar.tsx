import React from "react";
import Link from "next/link";

const Sidebar = () => {
    return (
        <div className="fixed top-0 left-0 h-screen w-[10vw] bg-gray-900 text-white p-4">
            <nav className="space-y-4">
                <p className="text-lg font-semibold">Menu</p>
                <ul className="space-y-2">
                    <li>
                        <Link
                            href="/rasta360"
                            className="block hover:text-blue-400 cursor-pointer"
                        >
                            Rasta.360
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="/nhai"
                            className="block hover:text-blue-400 cursor-pointer"
                        >
                            NHAI
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="/construction"
                            className="block hover:text-blue-400 cursor-pointer"
                        >
                            Construction
                        </Link>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;
