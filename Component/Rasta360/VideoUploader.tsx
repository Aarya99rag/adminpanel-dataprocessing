"use client";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
    initiateVideoUpload,
    getPresignedPartUrl,
    completeVideoUpload,
    abortVideoUpload,
} from "@/apis/operations/rasta360";
import {
    HardDriveUpload,
    FileVideo,
    XCircle,
    Pause,
    Play,
    X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type Part = { PartNumber: number; ETag: string };

const MIN_PART = 5 * 1024 * 1024;
const DEFAULT_CHUNK = 10 * 1024 * 1024;
const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const LS_PREFIX = "s3meta_v1";

function fingerprint(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

function calcPartSize(size: number) {
    const MIN_PART = 5 * 1024 * 1024; // 5 MB
    const TARGET_PARTS = 1000; // aim for ~1000 parts
    let partSize = Math.ceil(size / TARGET_PARTS);

    // ensure at least AWS minimum
    if (partSize < MIN_PART) partSize = MIN_PART;

    // optionally cap part size to something reasonable (e.g., 100 MB)
    const MAX_PART = 100 * 1024 * 1024;
    if (partSize > MAX_PART) partSize = MAX_PART;

    return partSize;
}

export default function VideoUploader({
    tripID,
    expectedFileName,
}: {
    tripID: string;
    expectedFileName: string;
}) {
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [status, setStatus] = useState<
        "Idle" | "Uploading" | "Paused" | "Finalizing" | "Completed" | "Error"
    >("Idle");
    const [message, setMessage] = useState<string>("");
    const params = useSearchParams();
    // const fileName = params.get("fileName");

    // refs
    const fileRef = useRef<File | null>(null);
    const uploadIdRef = useRef<string | null>(null);
    const keyRef = useRef<string | null>(null);
    const partSizeRef = useRef<number>(DEFAULT_CHUNK);
    const totalPartsRef = useRef<number>(0);
    const nextPartRef = useRef<number>(1);
    // Map<PartNumber, ETag>
    const uploadedMapRef = useRef<Map<number, string>>(new Map());
    const inflightRef = useRef<Map<number, AbortController>>(new Map());
    const pausedRef = useRef<boolean>(false);
    const pausedByUserRef = useRef<boolean>(false);
    const concurrencyRef = useRef<number>(CONCURRENCY);

    const router = useRouter();

    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);

        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);

        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, []);

    function metaKeyFor(file: File) {
        return `${LS_PREFIX}:${fingerprint(file)}`;
    }

    function saveMetaFor(file: File) {
        const k = metaKeyFor(file);
        const partsArray = Array.from(uploadedMapRef.current.entries()).map(
            ([PartNumber, ETag]) => ({ PartNumber, ETag })
        );
        const meta = {
            uploadId: uploadIdRef.current,
            key: keyRef.current,
            partSize: partSizeRef.current,
            totalParts: totalPartsRef.current,
            nextPart: Math.min(nextPartRef.current, totalPartsRef.current),
            uploadedParts: partsArray, // persist array of parts
            status,
        };
        localStorage.setItem(k, JSON.stringify(meta));
    }

    // used when user reselcts same file after pause
    function loadMetaFor(file: File) {
        const k = metaKeyFor(file);
        const raw = localStorage.getItem(k);
        // console.log("[loadMetaFor] trying", k, raw ? "found" : "not found");
        return raw ? JSON.parse(raw) : null;
    }

    // done after abort/complete
    function clearMetaFor(file: File) {
        const k = metaKeyFor(file);
        localStorage.removeItem(k);
        // console.log("[clearMetaFor] removed", k);
    }

    function updateProgressUI() {
        const done = uploadedMapRef.current.size;
        const total = totalPartsRef.current || 1;
        const pct = Math.round((done / total) * 100);
        setProgress(pct);
        if (done === total && total > 0) setStatus("Finalizing");
    }

    function claimNextPart(): number | null {
        const next = nextPartRef.current;
        if (next > totalPartsRef.current) return null;
        nextPartRef.current = next + 1;
        return next;
    }

    function uniqueUploadedCount() {
        return uploadedMapRef.current.size;
    }

    async function uploadChunk(
        file: File,
        partNumber: number,
        attempt = 1
    ): Promise<void> {
        if (uploadedMapRef.current.has(partNumber)) return;

        const start = (partNumber - 1) * partSizeRef.current;
        const end = Math.min(start + partSizeRef.current, file.size);
        const blob = file.slice(start, end);

        try {
            const presignResp = await getPresignedPartUrl(
                keyRef.current!,
                uploadIdRef.current!,
                partNumber
            );
            const url = presignResp?.data?.url;
            const controller = new AbortController();
            inflightRef.current.set(partNumber, controller);

            const res = await fetch(url, {
                method: "PUT",
                body: blob,
                headers: {
                    "Content-Type": file.type || "application/octet-stream",
                },
                signal: controller.signal,
            });
            inflightRef.current.delete(partNumber);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let etag = res.headers.get("ETag") || "";
            etag = etag.replace(/"/g, "");
            if (!etag)
                console.warn(
                    `[uploadChunk] ETag missing for part ${partNumber}. Check S3 CORS (ExposeHeader: ETag).`
                );

            // record to Map (dedup)
            if (!uploadedMapRef.current.has(partNumber)) {
                uploadedMapRef.current.set(partNumber, etag);
                saveMetaFor(file);
            }
            updateProgressUI();
        } catch (err: any) {
            inflightRef.current.delete(partNumber);
            if (pausedRef.current || pausedByUserRef.current) return;
            if (attempt < MAX_RETRIES) {
                await new Promise((r) =>
                    setTimeout(r, 500 * Math.pow(2, attempt))
                );
                return uploadChunk(file, partNumber, attempt + 1);
            }
            setMessage(
                `Failed uploading part ${partNumber}: ${err?.message || err}`
            );
            setStatus("Error");
            pause(false);
        }
    }

    async function startWorkers(file: File) {
        if (!file) return;
        setStatus("Uploading");
        pausedRef.current = false;
        pausedByUserRef.current = false;
        setMessage("Uploading...");

        const inFlight = new Set<number>(); // track parts currently uploading

        const uploadNextPart = async () => {
            while (!pausedRef.current) {
                // Claim a part atomically
                let partNumber = claimNextPart();
                // If we've exhausted parts, exit
                if (partNumber === null) return;

                // If this part was already uploaded (from resume or duplicate), skip it and claim again
                while (
                    uploadedMapRef.current.has(partNumber) &&
                    !pausedRef.current
                ) {
                    partNumber = claimNextPart();
                    if (partNumber === null) return;
                }

                // final guard
                if (partNumber === null || partNumber > totalPartsRef.current)
                    return;

                inFlight.add(partNumber);
                try {
                    await uploadChunk(file, partNumber);
                } catch (err) {
                    console.error(
                        `[startWorkers] part ${partNumber} failed`,
                        err
                    );
                    // uploadChunk handles retries/errors
                } finally {
                    inFlight.delete(partNumber);
                }
            }
        };

        // start N concurrent workers
        const workers = Array.from({ length: concurrencyRef.current }, () =>
            uploadNextPart()
        );

        // wait for all workers to finish
        await Promise.all(workers);

        // wait for any in-flight parts to complete
        while (inFlight.size > 0) {
            await new Promise((r) => setTimeout(r, 500));
        }

        // Use unique count for final check
        const doneUnique = uniqueUploadedCount();
        const total = totalPartsRef.current || 0;

        if (!pausedRef.current && doneUnique === total && total > 0) {
            setStatus("Finalizing");
            setMessage("Finalizing upload...");

            const sortedParts = Array.from(uploadedMapRef.current.entries())
                .map(([PartNumber, ETag]) => ({ PartNumber, ETag }))
                .sort((a, b) => a.PartNumber - b.PartNumber);

            try {
                console.time("completeMultipart");

                const res = await completeVideoUpload(
                    uploadIdRef.current!,
                    keyRef.current!,
                    sortedParts,
                    tripID
                );
                console.timeEnd("completeMultipart");

                setStatus("Completed");
                setProgress(100);
                setMessage("Upload completed successfully");
                clearMetaFor(file);
            } catch (err: any) {
                console.error("[startWorkers] complete failed", err);
                setStatus("Error");
                setMessage("Complete failed: " + (err?.message || err));
            }
        } else if (pausedRef.current) {
            setStatus("Paused");
            setMessage("Upload paused");
        } else {
            // not paused but counts don't match — show insightful message
            setMessage(
                `Waiting: uploaded ${doneUnique}/${total} unique parts — retrying or paused.`
            );
        }
    }

    function pause(byUser = true) {
        pausedRef.current = true;
        if (byUser) pausedByUserRef.current = true;
        setStatus("Paused");
        // console.log("[pause] pausing, byUser=", byUser);
        inflightRef.current.forEach((c, p) => {
            try {
                c.abort();
                // console.log("[pause] aborted inflight", p);
            } catch {}
        });
        inflightRef.current.clear();
        if (fileRef.current) saveMetaFor(fileRef.current);
    }

    async function resume() {
        if (!fileRef.current)
            return toast.error("Please select the same file to resume.");
        pausedRef.current = false;
        pausedByUserRef.current = false;
        setStatus("Uploading");
        // console.log("[resume] resuming upload");
        await startWorkers(fileRef.current);
    }

    async function abort() {
        if (!uploadIdRef.current || !keyRef.current || !fileRef.current) return;
        // console.log("[abort] aborting upload", {
        //     uploadId: uploadIdRef.current,
        //     key: keyRef.current,
        // });
        pause(true);
        try {
            await abortVideoUpload(uploadIdRef.current, keyRef.current);
            // console.log("[abort] abort API called");
        } catch (err) {
            console.warn("[abort] abort API failed", err);
        }
        clearMetaFor(fileRef.current);
        fileRef.current = null;
        uploadIdRef.current = null;
        keyRef.current = null;
        uploadedMapRef.current = new Map();
        setSelectedName(null);
        setProgress(0);
        setStatus("Idle");
        setMessage("Aborted");
    }

    async function onFileSelected(f: File | null) {
        if (!f) return;

        if (f.name !== expectedFileName) {
            toast.error(`Upload correct file: ${expectedFileName}`);
            return;
        }

        fileRef.current = f;
        setSelectedName(f.name);
        // console.log("[onFileSelected] file selected:", {
        //     name: f.name,
        //     size: f.size,
        // });

        const meta = loadMetaFor(f);
        if (meta && meta.uploadId && meta.key) {
            // console.log("[onFileSelected] found saved meta => resume", meta);
            uploadIdRef.current = meta.uploadId;
            keyRef.current = meta.key;
            partSizeRef.current = meta.partSize || calcPartSize(f.size);
            totalPartsRef.current =
                meta.totalParts || Math.ceil(f.size / partSizeRef.current);
            uploadedMapRef.current = new Map(
                (meta.uploadedParts || []).map((p: Part) => [
                    p.PartNumber,
                    p.ETag,
                ])
            );
            const uploadedSet = new Set(
                Array.from(uploadedMapRef.current.keys())
            );
            let n = 1;
            while (uploadedSet.has(n) && n <= totalPartsRef.current) n++;
            nextPartRef.current = n;
            setMessage("Resuming previous upload");
            setStatus(meta.status || "paused");
            updateProgressUI();
            if (meta.status === "uploading") {
                await startWorkers(f);
            }
            return;
        }

        try {
            // console.log("[onFileSelected] initiating upload for file:", f.name);
            const res = await initiateVideoUpload(f.name);
            const out = res?.data || res;
            uploadIdRef.current = out.uploadId || out.UploadId || out.uploadId;
            keyRef.current =
                out.key || `adminPanelDummy/${encodeURIComponent(f.name)}`;
            partSizeRef.current = calcPartSize(f.size);
            totalPartsRef.current = Math.ceil(f.size / partSizeRef.current);
            nextPartRef.current = 1;
            uploadedMapRef.current = new Map();
            saveMetaFor(f);
            setMessage("Ready to upload. Click Upload to start.");
            setStatus("Idle");
        } catch (err: any) {
            console.error("[onFileSelected] init error", err);
            setStatus("Error");
            setMessage("Init failed: " + (err?.message || err));
            toast.error("Failed to start upload");
        }
    }

    async function startUpload() {
        if (!fileRef.current) {
            toast.error("No file selected");
            return;
        }

        try {
            setMessage("Starting upload...");
            setStatus("Uploading");
            await startWorkers(fileRef.current);
        } catch (err: any) {
            console.error("[startUpload] error", err);
            toast.error("Failed to start upload");
            setStatus("Error");
            setMessage("Failed to start upload: " + (err?.message || err));
        }
    }

    // network online/offline handling
    useEffect(() => {
        const onOffline = () => {
            if (status === "Uploading") {
                pause(false);
                setMessage("Network offline — auto-paused");
            }
        };
        const onOnline = () => {
            if (
                pausedRef.current &&
                !pausedByUserRef.current &&
                fileRef.current
            ) {
                resume();
                setMessage("Network online — resuming");
            }
        };
        window.addEventListener("offline", onOffline);
        window.addEventListener("online", onOnline);
        return () => {
            window.removeEventListener("offline", onOffline);
            window.removeEventListener("online", onOnline);
        };
    }, [status]);

    return !tripID ? (
        <p>
            Make sure to properly upload Metadata properly then proceed for
            video upload
        </p>
    ) : (
        <div className="bg-white w-[40vw] p-6 rounded-2xl shadow-lg mx-auto mt-2">
            <div className="flex justify-between">
                <h3 className="text-xl font-semibold text-gray-800">
                    Upload file{" "}
                    <span className="text-[#FE6100]">{expectedFileName}</span>
                </h3>
                <X
                    className="cursor-pointer text-[#FE6100] hover:bg-[#aaaaaacc] rounded-full"
                    onClick={() => {
                        router.push("/rasta360");
                    }}
                />
            </div>

            {status === "Completed" && (
                <div className="mt-6 flex items-center justify-between bg-green-100 border border-green-300 p-4 rounded-lg">
                    <span className="text-green-700 font-medium">
                        ✅ Successfully uploaded!
                    </span>
                    <button
                        className="text-gray-600 cursor-pointer hover:text-red-600 transition"
                        onClick={() => {
                            setSelectedName(null);
                            setStatus("Idle");
                            setProgress(0);
                        }}
                    >
                        <XCircle size={24} />
                    </button>
                </div>
            )}

            {!navigator.onLine && (
                <div className="mt-4 bg-orange-100 border border-orange-300 text-orange-700 p-3 rounded-lg text-sm">
                    ⚠️ Connection lost. Upload will resume when you’re back
                    online.
                </div>
            )}

            <Image
                src="/Uploading.svg"
                alt="Uploading..."
                width={350}
                height={350}
                className="mx-auto"
            />

            {!selectedName && status === "Idle" && (
                <label className="flex flex-col items-center px-2 py-2  bg-gray-50 border-2 border-dashed border-gray-400 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                    <HardDriveUpload
                        className="text-[#FE6100] mb-2"
                        size={40}
                    />
                    <span className="text-gray-700 font-medium">
                        Select a Video
                    </span>
                    <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) =>
                            onFileSelected(e.target.files?.[0] ?? null)
                        }
                    />
                </label>
            )}

            {selectedName && status === "Idle" && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                            <FileVideo className="text-red-500" size={28} />
                            <span className="text-gray-800 font-medium truncate max-w-xs">
                                {selectedName}
                            </span>
                        </div>
                        <button
                            className="text-gray-500 hover:text-red-600 transition cursor-pointer"
                            onClick={() => {
                                setSelectedName(null);
                                fileRef.current = null;
                                setProgress(0);
                                setStatus("Idle");
                            }}
                        >
                            <XCircle size={28} />
                        </button>
                    </div>

                    <button
                        onClick={() => startUpload()}
                        className="bg-[#FE6100] text-white px-4 py-2 rounded-lg shadow hover:bg-orange-600 cursor-pointer transition w-30 mx-auto"
                    >
                        Upload
                    </button>
                </div>
            )}

            {["Uploading", "Paused", "Finalizing"].includes(status) && (
                <div className="mt-4">
                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">
                                Progress
                            </span>
                            <span className="text-sm text-gray-600">
                                {progress}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div
                                style={{ width: `${progress}%` }}
                                className="h-full bg-gradient-to-r from-[#FE6100] to-[#fe2f00] transition-all"
                            />
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                            {message}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-3 items-center justify-end">
                        {!isOnline ? (
                            <Button
                                disabled
                                className="flex items-center gap-1 bg-gray-300 text-gray-600 px-3 py-1 rounded-lg cursor-not-allowed"
                            >
                                <Play size={18} /> Resume
                            </Button>
                        ) : status === "Uploading" ? (
                            <Button
                                onClick={() => pause(true)}
                                className="flex items-center gap-1 bg-[#FE6100] text-white px-3 py-1 rounded-lg hover:bg-orange-600"
                            >
                                <Pause size={18} /> Pause
                            </Button>
                        ) : (
                            <Button
                                onClick={async () => {
                                    if (!fileRef.current)
                                        return toast.error("Select file");
                                    if (!uploadIdRef.current)
                                        await onFileSelected(fileRef.current);
                                    else if (status === "Paused")
                                        await resume();
                                }}
                                className="flex items-center gap-1 bg-[#FE6100] text-white px-3 py-1 rounded-lg hover:bg-orange-600"
                            >
                                <Play size={18} /> Resume
                            </Button>
                        )}

                        <Button
                            onClick={() => abort()}
                            className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200"
                        >
                            <X size={18} /> Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
