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
const CONCURRENCY = 2;
const MAX_RETRIES = 3;
const LS_PREFIX = "s3meta_v1";
const TARGET_PARTS = 1000;

const GLOBAL_MAX_CONCURRENT = 4;

function fingerprint(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

function calcPartSize(size: number) {
    let partSize = Math.ceil(size / TARGET_PARTS);
    if (partSize < MIN_PART) partSize = MIN_PART;
    const MAX_PART = 100 * 1024 * 1024;
    if (partSize > MAX_PART) partSize = MAX_PART;
    return partSize;
}

type UIUpload = {
    file: File;
    progress: number;
    status:
        | "Idle"
        | "Uploading"
        | "Paused"
        | "Finalizing"
        | "Completed"
        | "Error";
    message: string;
};

export default function VideoUploader({
    tripID,
    expectedFileName,
}: {
    tripID: string;
    expectedFileName: string;
}) {
    const [filename, setFilename] = useState<string | null>(null);
    const [uploadsUI, setUploadsUI] = useState<Record<string, UIUpload>>({});
    const uploadsUIRef = useRef<Record<string, UIUpload>>({});
    const router = useRouter();

    const searchParams = useSearchParams();

    const [uploading, setUploading] = useState(false);

    const globalActiveRef = useRef(0);

    async function acquireGlobalSlot() {
        while (globalActiveRef.current >= GLOBAL_MAX_CONCURRENT) {
            await new Promise((r) => setTimeout(r, 150));
        }
        globalActiveRef.current++;
    }

    function releaseGlobalSlot() {
        globalActiveRef.current = Math.max(0, globalActiveRef.current - 1);
    }

    const [isOnline, setIsOnline] = useState(
        typeof navigator !== "undefined" ? navigator.onLine : true
    );
    const isOnlineRef = useRef<boolean>(
        typeof navigator !== "undefined" ? navigator.onLine : true
    );

    function setUploadsUIAndRef(next: Record<string, UIUpload>) {
        uploadsUIRef.current = next;
        setUploadsUI(next);
    }

    function updateUIFor(file: File, partial: Partial<UIUpload>) {
        const key = fingerprint(file);
        const prev = uploadsUIRef.current[key];
        const merged: UIUpload = {
            ...(prev ?? {
                file,
                progress: 0,
                status: "Idle",
                message: "Ready",
            }),
            ...partial,
        };
        const copy = { ...uploadsUIRef.current, [key]: merged };
        setUploadsUIAndRef(copy);
    }

    useEffect(() => {
        const goOnline = () => {
            isOnlineRef.current = true;
            setIsOnline(true);
            // auto-resume uploads that were auto-paused by network
            Object.values(uploadsRef.current).forEach((u) => {
                if (u.paused && !u.pausedByUser && !u.aborted) {
                    resume(u.file).catch(() => {});
                }
            });
        };
        const goOffline = () => {
            isOnlineRef.current = false;
            setIsOnline(false);
            // auto-pause all uploading files
            Object.values(uploadsRef.current).forEach((u) => {
                if (!u.paused && !u.aborted) {
                    pause(u.file, false); // byUser = false
                }
            });
        };
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, []);

    type UploadRef = {
        file: File;
        uploadId: string | null;
        key: string | null;
        partSize: number;
        totalParts: number;
        nextPart: number;
        uploadedParts: Map<number, string>;
        inflight: Map<number, AbortController>;
        paused: boolean;
        pausedByUser: boolean;
        aborted?: boolean;
        claimedParts: Set<number>;
    };
    const uploadsRef = useRef<Record<string, UploadRef>>({});

    function metaKeyFor(file: File) {
        return `${LS_PREFIX}:${fingerprint(file)}`;
    }

    function saveMetaFor(ref: UploadRef) {
        if (ref.aborted) return;
        const partsArray = Array.from(ref.uploadedParts.entries()).map(
            ([PartNumber, ETag]) => ({ PartNumber, ETag })
        );
        const nextPart = Math.min(ref.nextPart ?? 1, (ref.totalParts ?? 0) + 1);

        const meta = {
            uploadId: ref.uploadId,
            key: ref.key,
            partSize: ref.partSize,
            totalParts: ref.totalParts,
            nextPart,
            uploadedParts: partsArray, // persist array of parts
            status: ref.paused ? "Paused" : "Uploading",
        };
        localStorage.setItem(metaKeyFor(ref.file), JSON.stringify(meta));
    }

    function loadMetaFor(file: File): any | null {
        const raw = localStorage.getItem(metaKeyFor(file));
        return raw ? JSON.parse(raw) : null;
    }

    function clearMetaFor(file: File) {
        try {
            localStorage.removeItem(metaKeyFor(file));
        } catch (err) {}
    }

    // function updateProgressUI() {
    //     const done = uploadedMapRef.current.size;
    //     const total = totalPartsRef.current || 1;
    //     const pct = Math.round((done / total) * 100);
    //     setProgress(pct);
    //     if (done === total && total > 0) setStatus("Finalizing");
    // }

    // function claimNextPart(): number | null {
    //     const next = nextPartRef.current;
    //     if (next > totalPartsRef.current) return null;
    //     nextPartRef.current = next + 1;
    //     return next;
    // }

    // function uniqueUploadedCount() {
    //     return uploadedMapRef.current.size;
    // }

    async function uploadChunk(
        fileKey: string,
        partNumber: number,
        attempt = 1
    ): Promise<void> {
        const ref = uploadsRef.current[fileKey];
        if (!ref) return;
        if (ref.uploadedParts.has(partNumber)) {
            ref.claimedParts.delete(partNumber);
            return;
        }
        const start = (partNumber - 1) * ref.partSize;
        const end = Math.min(start + ref.partSize, ref.file.size);
        const blob = ref.file.slice(start, end);

        try {
            await acquireGlobalSlot();

            const presignResp = await getPresignedPartUrl(
                ref.key!,
                ref.uploadId!,
                partNumber
            );
            const url = presignResp?.data?.url;
            const controller = new AbortController();
            ref.inflight.set(partNumber, controller);

            const res = await fetch(url, {
                method: "PUT",
                body: blob,
                headers: {
                    "Content-Type": ref.file.type || "application/octet-stream",
                },
                signal: controller.signal,
            });
            ref.inflight.delete(partNumber);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let etag = res.headers.get("ETag") || "";
            etag = etag.replace(/"/g, "");
            if (!etag)
                console.warn(
                    `[uploadChunk] ETag missing for part ${partNumber}. Check S3 CORS (ExposeHeader: ETag).`
                );

            if (!ref.uploadedParts.has(partNumber)) {
                ref.uploadedParts.set(partNumber, etag);
                ref.claimedParts.delete(partNumber);
                // update UI progress (unique count)
                const done = ref.uploadedParts.size;
                const total = ref.totalParts || 1;
                const pct = Math.round((done / total) * 100);
                updateUIFor(ref.file, { progress: pct });
                saveMetaFor(ref);
            }
        } catch (err: any) {
            ref.inflight.delete(partNumber);
            // always remove claim so it can be retried later
            ref.claimedParts.delete(partNumber);

            // aborted due to pause/abort
            if (err?.name === "AbortError") {
                return;
            }

            // network offline ,mark paused by network
            if (!isOnlineRef.current) {
                ref.paused = true;
                ref.pausedByUser = false;
                updateUIFor(ref.file, {
                    status: "Paused",
                    message: "Network offline — auto-paused",
                });
                saveMetaFor(ref);
                return;
            }

            if (attempt < MAX_RETRIES) {
                await new Promise((r) =>
                    setTimeout(r, 500 * Math.pow(2, attempt))
                );
                return uploadChunk(fileKey, partNumber, attempt + 1);
            }

            // unrecoverable error
            console.error(
                `[uploadChunk] failed file=${ref.file.name} part=${partNumber}`,
                err
            );
            ref.paused = true;
            updateUIFor(ref.file, {
                status: "Error",
                message: err?.message || "Upload failed",
            });
            saveMetaFor(ref);
        } finally {
            releaseGlobalSlot();
            ref.inflight.delete(partNumber);
            ref.claimedParts.delete(partNumber);
        }
    }

    async function startWorkers(file: File) {
        const key = fingerprint(file);
        const ref = uploadsRef.current[key];
        if (!ref) return;
        if (!isOnlineRef.current) {
            updateUIFor(file, {
                status: "Paused",
                message: "Network offline — auto-paused",
            });
            ref.paused = true;
            ref.pausedByUser = false;
            saveMetaFor(ref);
            return;
        }

        if (!ref.uploadId || !ref.key || !ref.partSize || !ref.totalParts) {
            updateUIFor(file, {
                status: "Error",
                message: "Upload not initialized",
            });
            return;
        }

        ref.paused = false;
        updateUIFor(file, { status: "Uploading", message: "Uploading..." });

        function findNextUnuploadedPart(): number | null {
            for (let n = ref.nextPart; n <= ref.totalParts; n++) {
                if (!ref.uploadedParts.has(n) && !ref.claimedParts.has(n)) {
                    ref.claimedParts.add(n);
                    ref.nextPart = n + 1;
                    saveMetaFor(ref);
                    return n;
                }
            }
            for (let n = 1; n < ref.nextPart; n++) {
                if (!ref.uploadedParts.has(n) && !ref.claimedParts.has(n)) {
                    ref.claimedParts.add(n);
                    saveMetaFor(ref);
                    return n;
                }
            }
            return null;
        }

        const inFlightSet = new Set<number>();

        const worker = async () => {
            while (true) {
                if (ref.paused || ref.aborted) return;
                const part = findNextUnuploadedPart();
                if (part === null) return;
                // skip if already uploaded
                if (ref.uploadedParts.has(part)) continue;
                inFlightSet.add(part);
                try {
                    await uploadChunk(key, part);
                } catch (err) {
                    console.error("[worker] part failed", err);
                } finally {
                    inFlightSet.delete(part);
                }
            }
        };

        // start concurrency workers and wait
        await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

        // wait for inflight to drain
        while (inFlightSet.size > 0) {
            await new Promise((r) => setTimeout(r, 300));
        }

        const doneCount = ref.uploadedParts.size;
        const total = ref.totalParts;

        if (!ref.aborted && doneCount === total) {
            updateUIFor(file, {
                status: "Finalizing",
                message: "Finalizing...",
            });

            const sortedParts = Array.from(ref.uploadedParts.entries())
                .map(([PartNumber, ETag]) => ({ PartNumber, ETag }))
                .sort((a, b) => a.PartNumber - b.PartNumber);

            try {
                // console.time("completeMultipart");

                const res = await completeVideoUpload(
                    ref.uploadId!,
                    ref.key!,
                    sortedParts,
                    tripID
                );
                // console.timeEnd("completeMultipart");

                updateUIFor(file, {
                    status: "Completed",
                    progress: 100,
                    message: "✅ Successfully uploaded!",
                });
                toast.success("Video uploaded successfully!");
                clearMetaFor(file);
                delete uploadsRef.current[key];
            } catch (err: any) {
                console.error("[startWorkers] complete failed", err);
                updateUIFor(file, {
                    status: "Error",
                    message: "Complete failed",
                });
            }
        } else if (ref.paused) {
            updateUIFor(file, { status: "Paused", message: "Upload paused" });
        } else {
            updateUIFor(file, {
                message: `Waiting: uploaded ${doneCount}/${total} parts`,
            });
        }
    }

    function pause(file: File, byUser = true) {
        const key = fingerprint(file);
        const ref = uploadsRef.current[key];
        if (!ref) return;
        ref.paused = true;
        ref.pausedByUser = byUser;
        // abort inflight controllers
        ref.inflight.forEach((ctrl) => {
            try {
                ctrl.abort();
            } catch {}
        });
        ref.inflight = new Map();
        updateUIFor(file, {
            status: "Paused",
            message: byUser ? "Paused" : "Network offline — auto-paused",
        });
        saveMetaFor(ref);
    }

    async function resume(file: File) {
        const key = fingerprint(file);
        const ref = uploadsRef.current[key];
        if (!ref) return;
        if (!isOnlineRef.current)
            return toast.error("Network offline — cannot resume");
        // clear pausedByNetwork flag
        ref.paused = false;
        ref.pausedByUser = false;
        updateUIFor(file, { status: "Uploading", message: "Resuming..." });
        // ensure workers restart
        await startWorkers(file);
    }

    async function abort(file: File) {
        const key = fingerprint(file);
        const ref = uploadsRef.current[key];
        if (!ref || !ref.uploadId || !ref.key) {
            const copyUI = { ...uploadsUIRef.current };
            delete copyUI[key];
            setUploadsUIAndRef(copyUI);
            delete uploadsRef.current[key];
            return;
        }

        // abort inflight
        ref.inflight.forEach((ctrl) => {
            try {
                ctrl.abort();
            } catch {}
        });
        ref.inflight = new Map();

        // mark aborted so saveMetaFor will skip
        ref.aborted = true;

        // remove localStorage meta
        clearMetaFor(ref.file);

        // call backend abort
        try {
            await abortVideoUpload(ref.uploadId!, ref.key!);
        } catch (err) {
            console.warn("backend abort failed", err);
        }

        // remove from UI and refs
        const copyUI = { ...uploadsUIRef.current };
        delete copyUI[key];
        setUploadsUIAndRef(copyUI);
        delete uploadsRef.current[key];
    }

    async function onFileSelected(f: File | null) {
        if (!f) return;

        if (f.name !== expectedFileName) {
            toast.error(`Upload correct file: ${expectedFileName}`);
            return;
        }

        const key = fingerprint(f);
        const prevMeta = loadMetaFor(f);

        const initialRef: UploadRef = {
            file: f,
            uploadId: prevMeta?.uploadId ?? null,
            key: prevMeta?.key ?? null,
            partSize: prevMeta?.partSize ?? calcPartSize(f.size),
            totalParts:
                prevMeta?.totalParts ??
                Math.ceil(
                    f.size / (prevMeta?.partSize ?? calcPartSize(f.size))
                ),
            nextPart: prevMeta?.nextPart ?? 1,
            uploadedParts: new Map(
                Array.isArray(prevMeta?.uploadedParts)
                    ? prevMeta.uploadedParts.map((p: Part) => [
                          p.PartNumber,
                          p.ETag,
                      ])
                    : []
            ),
            inflight: new Map(),
            paused: prevMeta?.status === "Paused",
            pausedByUser: false,
            aborted: false,
            claimedParts: new Set<number>(),
        };

        // save ref & UI
        uploadsRef.current = { ...uploadsRef.current, [key]: initialRef };
        updateUIFor(f, {
            file: f,
            progress:
                Math.round(
                    (initialRef.uploadedParts.size / initialRef.totalParts) *
                        100
                ) || 0,
            status: initialRef.paused ? "Paused" : "Idle",
            message: initialRef.paused
                ? "Resumed from previous"
                : "Ready to upload",
        });

        // if upload already has uploadId/key, just persist meta and return
        if (initialRef.uploadId && initialRef.key) {
            saveMetaFor(initialRef);
            return;
        }

        try {
            // console.log("[onFileSelected] initiating upload for file:", f.name);
            const res = await initiateVideoUpload(f.name);
            const out = res?.data || res;
            const uploadId = out.uploadId || out.UploadId || null;
            const s3Key =
                out.key || `adminPanelDummy/${encodeURIComponent(f.name)}`;
            initialRef.uploadId = uploadId;
            initialRef.key = s3Key;
            initialRef.partSize = calcPartSize(f.size);
            initialRef.totalParts = Math.ceil(f.size / initialRef.partSize);
            initialRef.nextPart = Math.min(
                initialRef.nextPart || 1,
                initialRef.totalParts
            );
            // persist and update UI
            uploadsRef.current = { ...uploadsRef.current, [key]: initialRef };
            saveMetaFor(initialRef);
            updateUIFor(f, { status: "Idle", message: "Ready to upload" });
        } catch (err: any) {
            console.error("[onFileSelected] initiate error:", err);
            updateUIFor(f, { status: "Error", message: "Init failed" });
            toast.error("Failed to initiate upload");
        }
    }

    async function startUpload(file: File) {
        const key = fingerprint(file);
        const ref = uploadsRef.current[key];
        if (!ref) return toast.error("Upload state missing");
        if (!ref.uploadId || !ref.key)
            return toast.error("Upload not initialized yet");
        if (!isOnlineRef.current) return toast.error("Network offline");

        await startWorkers(file);
    }

    const uiEntries = Object.entries(uploadsUI);
    const currentKey = uiEntries.length > 0 ? uiEntries[0][0] : null;
    const currentUI = currentKey ? uploadsUI[currentKey] : null;

    useEffect(() => {
        if (
            currentUI &&
            ["Uploading", "Paused", "Finalizing"].includes(currentUI.status)
        ) {
            setFilename(null);
        }
    }, [currentUI]);

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

            {currentUI?.status === "Completed" && (
                <div className="mt-6 flex items-center justify-between bg-green-100 border border-green-300 p-4 rounded-lg">
                    <span className="text-green-700 font-medium">
                        ✅ Successfully uploaded!
                    </span>
                    {/* <button
                        className="text-gray-600 cursor-pointer hover:text-red-600 transition"
                        
                    >
                        <XCircle size={24} />
                    </button> */}
                </div>
            )}

            {!isOnline && (
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

            {!filename &&
                (!currentUI ||
                    currentUI.status === "Idle" ||
                    currentUI.status === "Completed") && (
                    <label className="flex flex-col items-center px-4 py-6 bg-gray-50 border-2 border-dashed border-gray-400 rounded-xl cursor-pointer hover:bg-gray-100 transition mt-4">
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
                            className="sr-only"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                if (file) {
                                    setFilename(file.name);
                                    onFileSelected(file);
                                }
                            }}
                        />
                    </label>
                )}

            {filename &&
                currentUI &&
                ["Idle", "Completed", "Error"].includes(currentUI.status) && (
                    <div className="flex flex-col gap-3 mt-4">
                        <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-3">
                                <FileVideo className="text-red-500" size={28} />
                                <span className="text-gray-800 font-medium truncate max-w-xs">
                                    {filename}
                                </span>
                            </div>
                            <button
                                className="text-gray-500 hover:text-red-600 transition cursor-pointer"
                                onClick={() => {
                                    if (currentUI) {
                                        abort(currentUI.file).catch(() => {});
                                    } else {
                                        setFilename(null);
                                    }
                                }}
                            >
                                <XCircle size={28} />
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                if (currentUI) {
                                    startUpload(currentUI.file);

                                    setFilename(null);
                                }
                            }}
                            className="bg-[#FE6100] text-white px-4 py-2 rounded-lg shadow hover:bg-orange-600 cursor-pointer transition w-30 mx-auto"
                        >
                            Upload
                        </button>
                    </div>
                )}

            {currentUI &&
                ["Uploading", "Paused", "Finalizing"].includes(
                    currentUI.status
                ) && (
                    <div className="mt-4">
                        <div className="mb-4">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">
                                    Progress
                                </span>
                                <span className="text-sm text-gray-600">
                                    {currentUI.progress}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div
                                    style={{ width: `${currentUI.progress}%` }}
                                    className="h-full bg-gradient-to-r from-[#FE6100] to-[#fe2f00] transition-all"
                                />
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                                {currentUI.message}
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
                            ) : currentUI.status === "Uploading" ? (
                                <Button
                                    onClick={() => pause(currentUI.file, true)}
                                    className="flex items-center gap-1 bg-[#FE6100] text-white px-3 py-1 rounded-lg hover:bg-orange-600"
                                >
                                    <Pause size={18} /> Pause
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => resume(currentUI.file)}
                                    className="flex items-center gap-1 bg-[#FE6100] text-white px-3 py-1 rounded-lg hover:bg-orange-600"
                                >
                                    <Play size={18} /> Resume
                                </Button>
                            )}

                            <Button
                                onClick={() => abort(currentUI.file)}
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
