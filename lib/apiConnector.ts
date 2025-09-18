"use client";
import axios from "axios";
import toast from "react-hot-toast";

export const axiosInstance = axios.create({});

export const apiConnector = async (
    method: string,
    url: string,
    data: object | null,
    headers: object | null,
    params: object | null,
    responseType:
        | "arraybuffer"
        | "blob"
        // | "document"
        | "json"
        | "text"
        | "stream"
        | null
) => {
    try {
        const fields = {
            method: method,
            url: url,
            data: data || undefined,
            headers: headers || undefined,
            params: params || undefined,
            responseType: responseType || undefined,
        };

        // console.log(fields,"fields")

        const response = await axiosInstance(fields);
        // console.log(response,"res")

        return response;
    } catch (error: any) {
        if (error?.response?.status === 408) {
            toast.error("Session Expired! Please login again.");
            setTimeout(() => {
                localStorage.clear();
                if (typeof window !== "undefined") window.location.reload();
            }, 200);
        }
        // if (error.response) {
        // //   console.error("Error response data:", error.response.data);
        // }
        throw error;

        // const errorMessage = error?.response?.data?.error || "An error occurred";
        // toast.error(errorMessage);
    }
};