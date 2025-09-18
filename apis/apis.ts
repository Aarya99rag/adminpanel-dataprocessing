import { RASTA360_URL } from "@/lib/apiConnection";

export const RASTA360 = {
    GET_ALL_TRIPS_WITHOUT_VIDEO: `${RASTA360_URL}adminPanel/listOfTripsWithoutVideo`,
    UPLOAD_METADATA: `${RASTA360_URL}adminPanel/upload-metadata`,
    GET_OWNER_USERNAMES: `${RASTA360_URL}adminPanel/get-owner-usernames`,
    UPDATE_USERNAME: `${RASTA360_URL}adminPanel/update-username`,
    ADD_USER: `${RASTA360_URL}owner/create`
};

export const videoUpload = {
    GET_SURVEYS_FROM_PROJECTID: `${RASTA360_URL}adminPanel/get-surveys`,
    INIT_UPLOAD: `${RASTA360_URL}adminPanel/init`,
    GET_PRESIGN_URLS: `${RASTA360_URL}adminPanel/presign`,
    COMPLETE_UPLOAD: `${RASTA360_URL}adminPanel/complete`,
    ABORT: `${RASTA360_URL}adminPanel/abort`,
};
