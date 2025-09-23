import { apiConnector } from "@/lib/apiConnector";
import { RASTA360 } from "../apis";
import { videoUpload } from "../apis";

export const getAllTripsForVid = async () => {
    try {
        const response = await apiConnector(
            "get",
            `${RASTA360.GET_ALL_TRIPS_WITHOUT_VIDEO}`,
            null,
            // { Authorization: `${token}` },
            null,
            null,
            "json"
        );

        return response;
    } catch (error) {
        console.error("survey fetch error:", error);
        throw error;
    }
};

export const uploadMetaData = async (reqbody: any) => {
    try {
        const response = await apiConnector(
            "post",
            `${RASTA360.UPLOAD_METADATA}`,
            reqbody,
            // { Authorization: `${token}` },
            null,
            null,
            "json"
        );

        return response;
    } catch (error) {
        console.error("survey fetch error:", error);
        throw error;
    }
};

export const getUsernames = async () => {
    try {
        const response = await apiConnector(
            "get",
            `${RASTA360.GET_OWNER_USERNAMES}`,
            null,
            // { Authorization: `${token}` },
            null,
            null,
            "json"
        );

        return response;
    } catch (error) {
        console.error("survey fetch error:", error);
        throw error;
    }
};

export const updateUsername = async (
    pastUsername: string,
    username: string
) => {
    try {
        const response = await apiConnector(
            "post",
            `${RASTA360.UPDATE_USERNAME}`,
            { pastUsername, username },
            // { Authorization: `${token}` },
            null,
            null,
            "json"
        );

        return response;
    } catch (error) {
        console.error("survey fetch error:", error);
        throw error;
    }
};

export const getOfficeNames = async (officeName: string) => {
    try {
        const response = await apiConnector(
            "get",
            `${RASTA360.GET_OFFICE_NAMES}?officeName=${encodeURIComponent(
                officeName
            )}`,
            null, // { Authorization: `${token}` },
            null,
            null,
            "json"
        );

        return response;
    } catch (error) {
        console.error("survey fetch error:", error);
        throw error;
    }
};

export const addUser = async (formData: {
    name: string;
    username: string;
    password: string;
    office_name: string;
    email: string;
    phone: string;
    pastUsername?: string;
    office_id: string
}) => {
    try {
        const response = await apiConnector(
            "post",
            `${RASTA360.ADD_USER}`,
            formData,
            null,
            null,
            "json"
        );

        return response;
    } catch (error) {
        console.error("Add user API error:", error);
        throw error;
    }
};

export const initiateVideoUpload = async (
    fileName: string,
    project_id?: string
) => {
    try {
        const response = await apiConnector(
            "post",
            `${videoUpload.INIT_UPLOAD}`,
            { fileName, project_id },
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
            `${videoUpload.GET_PRESIGN_URLS}`,
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
    trip_id?: string
) => {
    try {
        const response = await apiConnector(
            "post",
            `${videoUpload.COMPLETE_UPLOAD}`,
            { uploadId, key, parts, trip_id },
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
            `${videoUpload.ABORT}`,
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
