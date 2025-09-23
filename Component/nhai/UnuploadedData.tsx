"use client";
import { getUnuploadedSurveys } from "@/apis/operations/nhai";
import React, { useEffect, useState } from "react";
import Loader from "../loader";
import Link from "next/link";
import Image from "next/image";

type Survey = {
    project_id: string;
    survey_id: string;
    survey_date: string;
    project_name: string;
    upc_id: string;
    NH_number: string;
    start_chainage: string;
    end_chainage?: string;
    distance?: string;
    state: string;
    fileName?: string;
};

const UnuploadedData = () => {
    const [loader, setLoader] = useState(true);
    const [surveyData, setSurveysData] = useState<Survey[]>([]);

    const getSurveys = async () => {
        try {
            const response = await getUnuploadedSurveys();
            if (response?.result?.length > 0) {
                setSurveysData(response.result);
            } else {
                setSurveysData([]);
            }
        } catch (error) {
            console.error("Failed to fetch surveys", error);
        }
        setLoader(false);
    };

    useEffect(() => {
        getSurveys();
    }, []);

    if (loader) return <Loader project="nhai" />;
    if (surveyData.length === 0)
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col justify-center items-center">
                    <Image
                        src="/Nodatanhai.svg"
                        alt="Uploading..."
                        width={500}
                        height={500}
                        className="mx-auto"
                    />
                    <p className="text-xl font-semibold">No data to Upload.</p>
                </div>
            </div>
        );

    return (
        <div className="mx-auto my-5 w-[100%] px-20">
            <h2 className="text-xl font-bold mb-6 text-[#034EA2]">
                Survey List to be uploaded:
            </h2>
            <div className="mx-auto w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {surveyData.length > 0
                    ? surveyData.map((survey) => (
                          <Link
                              key={survey.survey_id}
                              href={{
                                  pathname: `nhai/videoUpload/${survey.survey_id}`,
                                  query: {
                                      fileName: survey.fileName,
                                  },
                              }}
                          >
                              <div
                                  className="bg-white rounded-xl h-full cursor-pointer 
                            hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 p-5"
                                  style={{
                                      boxShadow:
                                          "rgba(0, 0, 0, 0.07) 0px 1px 2px, rgba(0, 0, 0, 0.07) 0px 2px 4px, rgba(0, 0, 0, 0.07) 0px 4px 8px, rgba(0, 0, 0, 0.07) 0px 8px 16px",
                                  }}
                              >
                                  <div className="pb-2 border-b border-gray-200 mb-3">
                                      <p className="text-sm text-gray-500 font-medium">
                                          Project Name
                                      </p>
                                      <h3
                                          className="text-base  text-[#034EA2] font-semibold break-words"
                                          title={survey.project_name}
                                      >
                                          {survey.project_name}
                                      </h3>
                                  </div>

                                  <div className="space-y-2 text-sm">
                                      <p className="flex justify-between">
                                          <span className="font-semibold">
                                              Survey Date:{" "}
                                          </span>
                                          <span className="text-gray-800">
                                              {survey.survey_date}
                                          </span>
                                      </p>
                                      <p className="flex justify-between">
                                          <span className="font-semibold">
                                              NH Number:{" "}
                                          </span>
                                          <span className="text-gray-800">
                                              {survey.NH_number}
                                          </span>
                                      </p>
                                      <p className="flex justify-between">
                                          <span className="font-semibold">
                                              UPC:{" "}
                                          </span>
                                          <span className="text-gray-800">
                                              {survey.upc_id}
                                          </span>
                                      </p>
                                      <p className="flex justify-between">
                                          <span className="font-semibold">
                                              State:{" "}
                                          </span>
                                          <span className="text-gray-800">
                                              {survey.state}
                                          </span>
                                      </p>
                                      <p className="flex justify-between">
                                          <span className="font-semibold">
                                              Start Chainage:{" "}
                                          </span>
                                          <span className="text-gray-800">
                                              {survey.start_chainage}
                                          </span>
                                      </p>
                                      {survey.end_chainage && (
                                          <p className="flex justify-between">
                                              <span className="font-semibold">
                                                  End Chainage:{" "}
                                              </span>
                                              <span className="text-gray-800">
                                                  {survey.end_chainage}
                                              </span>
                                          </p>
                                      )}
                                      {survey.distance && (
                                          <p className="flex justify-between">
                                              <span className="font-semibold">
                                                  Length (km):{" "}
                                              </span>
                                              <span className="text-gray-800">
                                                  {survey.distance}
                                              </span>
                                          </p>
                                      )}
                                      {survey.fileName && (
                                          <p className="flex justify-between">
                                              <span className="font-semibold">
                                                  File:{" "}
                                              </span>
                                              <span className="text-gray-800">
                                                  {survey.fileName}
                                              </span>
                                          </p>
                                      )}
                                  </div>
                              </div>
                          </Link>
                      ))
                    : null}
            </div>
        </div>
    );
};

export default UnuploadedData;
