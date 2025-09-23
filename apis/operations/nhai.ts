import { apiConnector } from "@/lib/apiConnector";
import { NHAI } from "../apis";

export const getUnuploadedSurveys = async () => {
    try {
        const response = await apiConnector(
            "get",
            `${NHAI.GET_ALL_TRIPS_WITHOUT_VIDEO}`,
            null,
            null,
            null,
            "json"
        );
        return response.data;
    } catch (error) {
        console.error("error in getting surveys:", error);
        throw error;
    }
};

export const initiateVideoUpload = async (
    fileName: string,
) => {
    try {
        const response = await apiConnector(
            "post",
            `${NHAI.INIT_UPLOAD}`,
            { fileName },
            null,
            null,
            "json"
        );
        return response;
    } catch (error) {
        console.error("initiateVideoUpload error:", error);
        throw error;
    }
};

export const getPresignedPartUrl = async (
    key: string,
    uploadId: string,
    partNumber: number
) => {
    try {
        const response = await apiConnector(
            "get",
            `${NHAI.GET_PRESIGN_URLS}`,
            null,
            null,
            { key, uploadId, partNumber },
            "json"
        );
        return response;
    } catch (error) {
        console.error("getPresignedPartUrl error:", error);
        throw error;
    }
};

export const completeVideoUpload = async (
    uploadId: string,
    key: string,
    parts: { PartNumber: number; ETag: string }[],
    survey_id?: string
) => {
    try {
        const response = await apiConnector(
            "post",
            `${NHAI.COMPLETE_UPLOAD}`,
            { uploadId, key, parts, survey_id },
            null,
            null,
            "json"
        );
        return response;
    } catch (error) {
        console.error("completeVideoUpload error:", error);
        throw error;
    }
};

export const abortVideoUpload = async (uploadId: string, key: string) => {
    try {
        const response = await apiConnector(
            "post",
            `${NHAI.ABORT}`,
            { uploadId, key },
            null,
            null,
            "json"
        );
        return response;
    } catch (error) {
        console.error("abortVideoUpload error:", error);
        throw error;
    }
};
