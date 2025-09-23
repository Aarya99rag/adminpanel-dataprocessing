"use client";
import VideoUploader from "@/Component/msidc/VideoUploader";
import React from "react";
import { useParams } from "next/navigation";

const page = () => {
    const params = useParams() as { surveyId: string };
    const surveyId = params?.surveyId ?? "";

    return (
        <div className="min-h-screen flex items-center justify-center">
            <VideoUploader surveyId={surveyId} />
        </div>
    );
};

export default page;
