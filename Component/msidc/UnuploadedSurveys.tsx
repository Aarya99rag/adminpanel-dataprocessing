"use client";
import { getUnuploadedSurveys } from "@/apis/operations/msidc";
import React, { useEffect, useState } from "react";
import Loader from "../loader";
import Link from "next/link";
import Image from "next/image";

interface Survey {
    authority_name: string;
    data_with_video: boolean;
    end_chainage: string;
    fileName: string;
    is_ascending: boolean;
    progress: string;
    project_id: string;
    project_name: string;
    road_name: string;
    road_no: string;
    site_supervisor_name: string;
    start_chainage: string;
    survey_date: string;
    survey_id: string;
    surveyor_name: string;
    user_id: string;
}

const UnuploadedSurveys = () => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loader, setLoader] = useState(true);

    const getUnuploadedSurveysForCards = async () => {
        try {
            const response = await getUnuploadedSurveys();
            setSurveys(response?.data || []);
        } catch (error) {
            console.error("error in getting surveys:", error);
            setSurveys([]); 
        } finally {
            setLoader(false); 
        }
    };

    useEffect(() => {
        getUnuploadedSurveysForCards();
    }, []);

    if (loader) {
        return <Loader project="msidc" />;
    }

    if (surveys.length === 0)
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col justify-center items-center">
                    <Image
                        src="/noDataMsidc.svg"
                        alt="Uploading..."
                        width={350}
                        height={350}
                        className="mx-auto"
                    />
                    <p className="text-xl font-semibold">No data to Upload.</p>
                </div>
            </div>
        );

    return (
        <div className="p-6">
            <h2 className="text-2xl px-10 font-bold text-[#088038] mb-6">
                Unuploaded Surveys ({surveys.length})
            </h2>

            <div className="mx-auto px-10 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {surveys.map((survey, idx) => (
                    <Link
                        key={survey.survey_id}
                        href={{
                            pathname: `/msidc/video-upload/${survey.survey_id}`,
                            query: { fileName: survey.fileName },
                        }}
                    >
                        <div
                            key={idx}
                            className="bg-white rounded-xl h-full cursor-pointer border border-[#d2d2d2]
                            hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 p-5"
                            style={{
                                boxShadow:
                                    "rgba(0, 0, 0, 0.07) 0px 1px 2px, rgba(0, 0, 0, 0.07) 0px 2px 4px, rgba(0, 0, 0, 0.07) 0px 4px 8px, rgba(0, 0, 0, 0.07) 0px 8px 16px",
                            }}
                        >
                            <div className="flex flex-col">
                                <h3 className="text-xl font-semibold text-green-800 mb-1">
                                    {survey.project_name} ({survey.road_no})
                                </h3>
                                <p className="text-sm text-[#088038] mb-2">
                                    {survey.road_name} • {survey.authority_name}
                                </p>

                                <span
                                    className={`px-3 py-1 mb-2 text-xs font-medium rounded-full w-23 text-center ${
                                        survey.is_ascending
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                    }`}
                                >
                                    {survey.is_ascending
                                        ? "Ascending"
                                        : "Descending"}
                                </span>
                            </div>

                            <hr className="mb-4" />

                            <div className="text-sm text-gray-700 space-y-2">
                                <p className="flex justify-between">
                                    <span className="font-semibold text-gray-900">
                                        Surveyor:
                                    </span>
                                    <span>{survey.surveyor_name}</span>
                                </p>

                                <p className="flex justify-between">
                                    <span className="font-semibold text-gray-900">
                                        Supervisor:
                                    </span>
                                    <span>{survey.site_supervisor_name}</span>
                                </p>

                                <p className="flex justify-between">
                                    <span className="font-semibold text-gray-900">
                                        Progress:
                                    </span>
                                    <span>{survey.progress}</span>
                                </p>

                                <p className="flex justify-between">
                                    <span className="font-semibold text-gray-900">
                                        File:
                                    </span>
                                    <span className="truncate max-w-[150px] text-right">
                                        {survey.fileName}
                                    </span>
                                </p>

                                <p className="flex justify-between">
                                    <span className="font-semibold text-gray-900">
                                        Date:
                                    </span>
                                    <span>
                                        {new Date(
                                            survey.survey_date
                                        ).toLocaleDateString()}
                                    </span>
                                </p>

                                <p className="flex justify-between">
                                    <span className="font-semibold text-gray-900">
                                        Chainage:
                                    </span>
                                    <span>
                                        {survey.start_chainage} →{" "}
                                        {survey.end_chainage}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default UnuploadedSurveys;
