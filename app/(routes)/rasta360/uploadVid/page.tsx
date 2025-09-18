"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import VideoUploader from "@/Component/Rasta360/VideoUploader";

const Page = () => {
    const params = useSearchParams();
    const tripID = params?.get("tripID") ?? "";
    const fileName = params?.get("fileName") ?? "";

    if (!tripID || !fileName) {
        return (
            <div className="p-8">
                <p className="text-sm text-gray-600">
                    Missing tripID or filename. Navigate again or submit
                    metadata first.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <VideoUploader tripID={tripID} expectedFileName={fileName} />
        </div>
    );
};

export default Page;
