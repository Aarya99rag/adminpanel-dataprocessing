"use client";

import { useEffect, useState } from "react";
import {
    User,
    MapPin,
    Map,
    Hash,
    Route,
    Milestone,
    X,
    Video,
    User2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { getUsernames, uploadMetaData } from "@/apis/operations/rasta360";
import VideoUploader from "./VideoUploader";
import AddUser from "./AddUser";

interface User {
    _id: string;
    username: string;
}

const MetadataForm = () => {
    const [formData, setFormData] = useState({
        username: "",
        roadCategory: "",
        roadNo: "",
        roadType: "",
        roadName: "",
        engineerName: "",
        distance: "",
        startChainage: { major: "", minor: "" },
        endChainage: { major: "", minor: "" },
        isAscending: "ascending",
        video_filename: "",
    });

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [savedFileName, setSavedFileName] = useState<string | null>(null);
    const [tripID, setTripId] = useState("");

    const [usernames, setUsernames] = useState<User[]>([]);
    const [filtered, setFiltered] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const getUserNamesForDropdown = async () => {
        try {
            const response = await getUsernames();
            const users = response.data.data || [];
            setUsernames(users);
            setFiltered(users);
        } catch (error) {
            console.log("error in getting usernames", error);
        }
    };

    useEffect(() => {
        getUserNamesForDropdown();
    }, []);

    useEffect(() => {
        if (!search.trim()) {
            setFiltered([]);
        } else {
            const regex = new RegExp(`^${search}`, "i");
            setFiltered(usernames.filter((u) => regex.test(u.username)));
        }
    }, [search, usernames]);

    const handleSelect = (username: string) => {
        setSearch(username);
        setFormData((prev) => ({ ...prev, username }));
        setOpen(false);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
        key?: "startChainage" | "endChainage",
        subKey?: "major" | "minor"
    ) => {
        let { name, value } = e.target;

        // only numbers allowed for roadNo and distance
        if (name === "roadNo" || name === "distance") {
            value = value.replace(/\D/g, ""); // remove non-digits
        }

        // limit startChainage major (2 digits) and minor (3 digits)
        if (key === "startChainage" && subKey === "major") {
            value = value.replace(/\D/g, "").slice(0, 2);
        }
        if (key === "startChainage" && subKey === "minor") {
            value = value.replace(/\D/g, "").slice(0, 3);
        }

        if (key === "endChainage" && subKey === "major") {
            value = value.replace(/\D/g, "").slice(0, 2);
        }
        if (key === "endChainage" && subKey === "minor") {
            value = value.replace(/\D/g, "").slice(0, 3);
        }

        if (key && subKey) {
            setFormData((prev) => ({
                ...prev,
                [key]: { ...prev[key], [subKey]: value },
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (
            !formData.username ||
            !formData.roadCategory ||
            !formData.roadNo ||
            !formData.roadType ||
            !formData.roadName ||
            !formData.startChainage.major ||
            !formData.startChainage.minor ||
            !formData.isAscending ||
            !formData.video_filename
        ) {
            toast.error("Enter all required fields");
            return;
        }

        const isValidUsername = usernames.some(
            (u) => u.username.toLowerCase() === search.toLowerCase()
        );
        if (!isValidUsername) {
            toast.error("Select username from dropdown");
            return;
        }

        const reqBody = {
            username: formData.username,
            roadName: formData.roadName,
            roadNo: formData.roadNo,
            roadType: formData.roadType,
            roadCategory: formData.roadCategory,
            startChainage: `${formData.startChainage.major}/${formData.startChainage.minor}`,
            endChainage:
                formData.endChainage.major || formData.endChainage.minor
                    ? `${formData.endChainage.major}/${formData.endChainage.minor}`
                    : "",
            distance: formData.distance,
            isAscending: formData.isAscending === "ascending",
            video_filename: formData.video_filename,
            measurementType: "Km",
        };

        try {
            const res = await uploadMetaData(reqBody);

            // Adjust based on your backend response structure:
            const tripIdFromServer =
                res?.data?.trip_id || res?.data?.data?.trip_id;

            if (tripIdFromServer) {
                toast.success("Metadata saved successfully!");
                setSavedFileName(formData.video_filename);
                setIsSubmitted(true);
                setTripId(tripIdFromServer); // now VideoUploader gets it
            } else {
                toast.error("Trip ID missing in response");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to save metadata");
        }
    };

    if (isSubmitted && savedFileName) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <VideoUploader
                    tripID={tripID}
                    expectedFileName={savedFileName}
                />
            </div>
        );
    }

    return (
        <div className="bg-white my-10 border border-[#E2E2E2] p-6 rounded-xl shadow-[2px_16px_19px_0px_#00000017] w-full md:w-[80%] lg:w-[70%] xl:w-[60%] mx-auto">
            <div className="flex justify-between">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">
                    Please enter the required details{" "}
                    <span className="text-red-500">*</span>
                </h2>
                <Link href="/rasta360">
                    <X className="text-white cursor-pointer bg-[#FE6100] rounded-full" />
                </Link>
            </div>

            {/* Responsive 2-column layout */}
            <form
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                onSubmit={handleSubmit}
            >
                {/* Left Column */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-600">
                            Username
                            <span className="text-red-500">*</span>
                        </label>
                        <div className="border rounded-lg px-3 py-2 bg-gray-50 relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => setOpen(true)}
                                placeholder="Search username..."
                                className="w-80 bg-transparent outline-none text-sm"
                            />

                            {open && filtered.length > 0 && (
                                <ul className="absolute left-0 right-0 mt-1 border rounded bg-white shadow max-h-40 overflow-y-auto z-10">
                                    {filtered.map((user) => (
                                        <li
                                            key={user._id}
                                            onMouseDown={() =>
                                                handleSelect(user.username)
                                            }
                                            className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                                        >
                                            {user.username}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <h1 className="text-sm text-gray-600">
                            If your desired username is not in the above list,
                            then{" "}
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(true)}
                                className="text-[#FE6100] cursor-pointer underline font-medium"
                            >
                                create it here
                            </button>
                            .
                        </h1>
                    </div>

                    {/* Road Category * */}
                    <div>
                        <label className="block text-sm text-gray-600">
                            Road category{" "}
                            <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50">
                            <MapPin className="text-[#FE6100] mr-2" />
                            <select
                                name="roadCategory"
                                value={formData.roadCategory}
                                onChange={handleChange}
                                className="w-full bg-transparent outline-none text-sm"
                            >
                                <option value="" disabled>
                                    Select road category
                                </option>
                                <option value="NH">NH</option>
                                <option value="MSH">MSH</option>
                                <option value="SH">SH</option>
                                <option value="MDR">MDR</option>
                                <option value="VR">VR</option>
                                <option value="Rural Road">Rural Road</option>
                                <option value="Package">Package</option>
                                <option value="Wards">Wards</option>
                                <option value="Major/Minor Roads CR">
                                    Major/Minor Roads CR
                                </option>
                                <option value="Lane no.">Lane no.</option>
                                <option value="Expressway">Expressway</option>
                                <option value="AH">AH</option>
                                <option value="ORR">ORR</option>
                                <option value="CR">CR</option>
                                <option value="IR">IR</option>
                            </select>
                        </div>
                    </div>

                    {/* Road Number * */}
                    <div>
                        <label className="block text-sm text-gray-600">
                            Road number <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50">
                            <Hash className="text-[#FE6100] mr-2" />
                            <input
                                type="number"
                                placeholder="Road number"
                                name="roadNo"
                                value={formData.roadNo}
                                onChange={handleChange}
                                className="w-full bg-transparent outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Road Type * */}
                    <div>
                        <label className="block text-sm text-gray-600">
                            Road type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50">
                            <Map className="text-[#FE6100] mr-2" />
                            <select
                                name="roadType"
                                value={formData.roadType}
                                onChange={handleChange}
                                className="w-full bg-transparent outline-none text-sm"
                            >
                                <option value="" disabled>
                                    Select road type
                                </option>
                                <option value="Cement Concrete(CC)">
                                    Cement Concrete (CC)
                                </option>
                                <option value="Bituminous Concrete(BT)">
                                    Bituminous Concrete (BT)
                                </option>
                                <option value="Mix Seal Carpet">
                                    Mix Seal Carpet
                                </option>
                                <option value="BBM Carpet">BBM Carpet</option>
                                <option value="Surface Dressing">
                                    Surface Dressing
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    {/* Road Name * */}
                    <div>
                        <label className="block text-sm text-gray-600">
                            Road name <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50">
                            <Route className="text-[#FE6100] mr-2" />
                            <input
                                type="text"
                                placeholder="Road name"
                                name="roadName"
                                value={formData.roadName}
                                onChange={handleChange}
                                className="w-full bg-transparent outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Distance (optional, numbers only) */}
                    <div>
                        <label className="block text-sm text-gray-600">
                            Distance
                        </label>
                        <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50">
                            <Milestone className="text-[#FE6100] mr-2" />
                            <input
                                type="number"
                                placeholder="Distance"
                                name="distance"
                                value={formData.distance}
                                onChange={handleChange}
                                className="w-full bg-transparent outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Start & End Chainage */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Start chainage * */}
                        <div>
                            <label className="text-sm text-gray-600">
                                Start chainage{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="text"
                                    placeholder="00"
                                    maxLength={2}
                                    value={formData.startChainage.major}
                                    onChange={(e) =>
                                        handleChange(
                                            e,
                                            "startChainage",
                                            "major"
                                        )
                                    }
                                    className="w-16 border rounded-lg px-2 py-2 bg-gray-50 text-sm outline-none text-center"
                                />
                                <span className="font-semibold text-gray-600">
                                    /
                                </span>
                                <input
                                    type="text"
                                    placeholder="000"
                                    maxLength={3}
                                    value={formData.startChainage.minor}
                                    onChange={(e) =>
                                        handleChange(
                                            e,
                                            "startChainage",
                                            "minor"
                                        )
                                    }
                                    className="w-20 border rounded-lg px-2 py-2 bg-gray-50 text-sm outline-none text-center"
                                />
                            </div>
                        </div>

                        {/* End chainage */}
                        <div>
                            <label className="text-sm text-gray-600">
                                End chainage
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="text"
                                    placeholder="00"
                                    maxLength={2}
                                    value={formData.endChainage.major}
                                    onChange={(e) =>
                                        handleChange(e, "endChainage", "major")
                                    }
                                    className="w-16 border rounded-lg px-2 py-2 bg-gray-50 text-sm outline-none text-center"
                                />
                                <span className="font-semibold text-gray-600">
                                    /
                                </span>
                                <input
                                    type="text"
                                    placeholder="000"
                                    maxLength={3}
                                    value={formData.endChainage.minor}
                                    onChange={(e) =>
                                        handleChange(e, "endChainage", "minor")
                                    }
                                    className="w-20 border rounded-lg px-2 py-2 bg-gray-50 text-sm outline-none text-center"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600">
                            Video Filename
                            <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50">
                            <Video className="text-[#FE6100] mr-2" />
                            <input
                                type="text"
                                placeholder="Video Filename"
                                name="video_filename"
                                value={formData.video_filename}
                                onChange={handleChange}
                                className="w-full bg-transparent outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Direction (Radio Buttons) * */}
                    <div>
                        <label className="block text-sm text-gray-600">
                            Direction <span className="text-red-500">*</span>
                        </label>
                        <div className="flex justify-around mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="isAscending"
                                    value="ascending"
                                    checked={
                                        formData.isAscending === "ascending"
                                    }
                                    onChange={handleChange}
                                    className="hidden peer"
                                />
                                <span className="w-4 h-4 border-2 border-[#FE6100] rounded-full flex items-center justify-center peer-checked:bg-[#FE6100]"></span>
                                <span className="text-sm">Ascending</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="isAscending"
                                    value="descending"
                                    checked={
                                        formData.isAscending === "descending"
                                    }
                                    onChange={handleChange}
                                    className="hidden peer"
                                />
                                <span className="w-4 h-4 border-2 border-[#FE6100] rounded-full flex items-center justify-center peer-checked:bg-[#FE6100]"></span>
                                <span className="text-sm">Descending</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 flex justify-center">
                    <Button
                        type="submit"
                        className="px-10 bg-[#FE6100] text-white font-semibold py-2 rounded-lg hover:bg-[#e35500] transition"
                    >
                        Submit
                    </Button>
                </div>
            </form>
            {showCreateForm && (
                <>
                    <div className="mt-6"></div>
                    <hr></hr>
                    <h1 className="mt-5 font-semibold">Create new User</h1>
                    <AddUser
                        setShowCreateForm={setShowCreateForm}
                        onUserCreated={(newUsername: string) => {
                            // refresh list
                            getUserNamesForDropdown();
                            // prefill newly created username
                            setSearch(newUsername);
                            setFormData((prev) => ({
                                ...prev,
                                username: newUsername,
                            }));
                            toast.success("User created and selected!");
                        }}
                    />
                </>
            )}
        </div>
    );
};

export default MetadataForm;
