"use client";

import React, { useEffect, useState } from "react";
import { getAllTripsForVid } from "@/apis/operations/rasta360";
import Loader from "../loader";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import UsernameUpdate from "./UsernameUpdate";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";

type Trip = {
    trip_id: string;
    username: string;
    timestampFolder: string;
    Date: string;
    roadName: string;
    roadNo: string;
    roadType: string;
    roadCategory: string;
    startChainage: string;
    endChainage: string;
    distance: string;
    isAscending: boolean;
    video_filename: string;
};

const UnuploadedVideos = () => {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]); // filtered results
    const [loading, setLoading] = useState(true);
    const [usernameModalOpen, setUsernameModalOpen] = useState(false);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(
        null
    );
    const [selectedPastUsername, setSelectedPastUsername] =
        useState<string>("");

    const [searchTerm, setSearchTerm] = useState("");
    const LS_PREFIX = "s3meta_v1";

    const fetchTrips = async () => {
        try {
            setLoading(true);
            const response = await getAllTripsForVid();
            setTrips(response.data.data);
            setFilteredTrips(response.data.data);
        } catch (err) {
            console.error("Error fetching trips:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrips();
    }, []);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key && e.key.startsWith(LS_PREFIX)) {
                setTrips((prev) => [...prev]);
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    function isTripUploading(fileName: string): boolean {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LS_PREFIX)) {
                const data = localStorage.getItem(key);
                if (data && data.includes(fileName)) return true;
            }
        }
        return false;
    }

    useEffect(() => {
        if (!searchTerm) {
            setFilteredTrips(trips);
            return;
        }

        const lowerTerm = searchTerm.toLowerCase();
        const filtered = trips.filter((trip) =>
            Object.values(trip).some(
                (val) => val && val.toString().toLowerCase().includes(lowerTerm)
            )
        );
        setFilteredTrips(filtered);
    }, [searchTerm, trips]);

    if (loading) return <Loader project="rasta360" />;
    if (trips.length === 0)
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col justify-center items-center">
                    <Image
                        src="/NodataRasta.svg"
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
        <>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-[#FE6100] pl-10">
                    Unuploaded Data
                </h1>

                <div className="flex gap-5">
                    <div className="mb-4 flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Search by any field..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:border-[#FE6100] placeholder:text-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="text-red-500 font-bold px-2 relative right-10 cursor-pointer"
                            >
                                X
                            </button>
                        )}
                    </div>
                    <Link href="/rasta360/uploadMeta">
                        <Button className="bg-[#FE6100] hover:bg-[#e35500]">
                            <Plus />
                            Add Metadata
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTrips.map((trip) => {
                    const fileName =
                        trip.video_filename || `trip-${trip.trip_id}.mp4`;
                    const disabled = isTripUploading(fileName);

                    return (
                        <div
                            key={trip.trip_id}
                            onClick={() => {
                                if (disabled) return;
                                setUsernameModalOpen(true);
                                setSelectedPastUsername(trip.username);
                                setSelectedTripId(trip.trip_id);
                                setSelectedFileName(
                                    trip.video_filename ||
                                        `trip-${trip.trip_id}.mp4`
                                );
                            }}
                            className={`bg-white rounded-xl shadow-[2px_16px_19px_0px_#00000017] border border-[#E2E2E2] p-6 flex flex-col justify-between 
        transform transition duration-300 ease-in-out ${
            disabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:-translate-y-2 hover:shadow-xl"
        }`}
                        >
                            <div className="flex justify-between">
                                <h2 className="text-lg font-bold text-[#FE6100] mb-4">
                                    {trip.roadName}
                                </h2>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium">
                                        Username :
                                    </span>
                                    <span className="text-gray-600">
                                        {trip.username}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="font-medium">
                                        Road No :
                                    </span>
                                    <span className="text-gray-600">
                                        {trip.roadNo}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="font-medium">
                                        Road Type :
                                    </span>
                                    <span className="text-gray-600">
                                        {trip.roadType}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="font-medium">
                                        Road Category :
                                    </span>
                                    <span className="text-gray-600">
                                        {trip.roadCategory}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="font-medium">
                                        Start Chainage :
                                    </span>
                                    <span className="text-gray-600">
                                        {trip.startChainage}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="font-medium">
                                        End Chainage :
                                    </span>
                                    <span className="text-gray-600">
                                        {trip.endChainage || "N/A"}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="font-medium">Date :</span>
                                    <span className="text-gray-600">
                                        {trip.Date || "N/A"}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="font-medium">
                                        Distance :
                                    </span>
                                    <span className="text-gray-600">
                                        {trip.distance || "N/A"}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="font-medium">
                                        Filename :
                                    </span>
                                    <span className="text-gray-600">
                                        {trip.video_filename || "N/A"}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="font-medium">
                                        Direction :
                                    </span>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            trip.isAscending
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                        }`}
                                    >
                                        {trip.isAscending
                                            ? "Ascending"
                                            : "Descending"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {usernameModalOpen && selectedTripId && (
                <UsernameUpdate
                    pastUsername={selectedPastUsername}
                    onClose={() => setUsernameModalOpen(false)}
                    onUpdated={fetchTrips}
                    tripId={selectedTripId}
                    expectedFileName={
                        selectedFileName ?? `trip-${selectedTripId}.mp4`
                    }
                />
            )}
        </>
    );
};

export default UnuploadedVideos;
