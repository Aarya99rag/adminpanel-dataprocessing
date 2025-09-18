import React from "react";

interface LoaderProps {
    project?: "rasta360" | "nhai"; 
}

const Loader: React.FC<LoaderProps> = ({ project = "rasta360" }) => {
    const projectColors: Record<string, string> = {
        rasta360: "#FE6100", // orange
        nhai: "#034EA2", // blue
    };

    const color = projectColors[project] || "#FE6100"; // fallback = orange

    return (
        <div className="flex justify-center items-center h-[100vh]">
            <div className="flex space-x-2">
                <span
                    className="w-3 h-3 rounded-full animate-bounce"
                    style={{ backgroundColor: color }}
                ></span>
                <span
                    className="w-3 h-3 rounded-full animate-bounce delay-200"
                    style={{ backgroundColor: color }}
                ></span>
                <span
                    className="w-3 h-3 rounded-full animate-bounce delay-400"
                    style={{ backgroundColor: color }}
                ></span>
            </div>
        </div>
    );
};

export default Loader;
