import { MSIDC_URL, NHAIBEFORE_URL, RASTA360_URL } from "@/lib/apiConnection";

export const RASTA360 = {
    GET_ALL_TRIPS_WITHOUT_VIDEO: `${RASTA360_URL}adminPanel/listOfTripsWithoutVideo`,
    UPLOAD_METADATA: `${RASTA360_URL}adminPanel/upload-metadata`,
    GET_OWNER_USERNAMES: `${RASTA360_URL}adminPanel/get-owner-usernames`,
    UPDATE_USERNAME: `${RASTA360_URL}adminPanel/update-username`,
    ADD_USER: `${RASTA360_URL}owner/create`,
    GET_OFFICE_NAMES: `${RASTA360_URL}office-section/get-office-list-by-regex`,
};

export const videoUpload = {
    GET_SURVEYS_FROM_PROJECTID: `${RASTA360_URL}adminPanel/get-surveys`,
    INIT_UPLOAD: `${RASTA360_URL}adminPanel/init`,
    GET_PRESIGN_URLS: `${RASTA360_URL}adminPanel/presign`,
    COMPLETE_UPLOAD: `${RASTA360_URL}adminPanel/complete`,
    ABORT: `${RASTA360_URL}adminPanel/abort`,
};

export const NHAI = {
    GET_ALL_TRIPS_WITHOUT_VIDEO: `${NHAIBEFORE_URL}survey/get-surveys-panel`,
    INIT_UPLOAD: `${NHAIBEFORE_URL}survey/init`,
    GET_PRESIGN_URLS: `${NHAIBEFORE_URL}survey/presign`,
    COMPLETE_UPLOAD: `${NHAIBEFORE_URL}survey/complete`,
    ABORT: `${NHAIBEFORE_URL}survey/abort`,
};

export const MSIDC = {
    GET_ALL_SURVEYS_WITHOUT_VIDEO: `${MSIDC_URL}adminpanel/get-unuploaded-surveys`,
    INIT_UPLOAD: `${MSIDC_URL}adminpanel/init`,
    GET_PRESIGN_URLS: `${MSIDC_URL}adminpanel/presign`,
    COMPLETE_UPLOAD: `${MSIDC_URL}adminpanel/complete`,
    ABORT: `${MSIDC_URL}adminpanel/abort`,
};
