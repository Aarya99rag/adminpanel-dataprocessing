"use client";
import { getUsernames, updateUsername } from "@/apis/operations/rasta360";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import AddUser from "./AddUser";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface User {
    _id: string;
    username: string;
}

interface UsernameUpdateProps {
    pastUsername: string;
    onClose: () => void;
    onUpdated: () => void;
    tripId?: string; // optional, passed from UnuploadedVideos
    expectedFileName?: string;
}

const UsernameUpdate: React.FC<UsernameUpdateProps> = ({
    pastUsername,
    onClose,
    onUpdated,
    tripId,
    expectedFileName,
}) => {
    const [usernames, setUsernames] = useState<User[]>([]);
    const [filtered, setFiltered] = useState<User[]>([]);
    const [search, setSearch] = useState(pastUsername);
    const [open, setOpen] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const router = useRouter();

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
        setOpen(false);
    };

    const updateUserName = async () => {
        try {
            if (!search.trim()) {
                toast.error("Please select a valid username from the list");
                return;
            }

            const response = await updateUsername(pastUsername, search);

            if (response.data.success) {
                toast.success("Username updated successfully!");
                onClose(); // close modal
                onUpdated?.(); // refresh cards
                // redirect to upload page with params
                router.push(
                    `/rasta360/uploadVid?tripID=${encodeURIComponent(
                        tripId ?? ""
                    )}&fileName=${encodeURIComponent(expectedFileName ?? "")}`
                );
            } else {
                toast.error(
                    response.data.message || "Failed to update username"
                );
            }
        } catch (error) {
            console.log("Error updating username", error);
            toast.error("Something went wrong while updating");
        }
    };

    const isValidUsername = usernames.some(
        (u) => u.username.toLowerCase() === search.toLowerCase()
    );

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
            <div className="bg-white w-[50%] p-6 rounded-xl shadow-xl relative">
                <div className="flex justify-between items-center">
                    <h1 className="text-[#FE6100] font-semibold">
                        {showCreateForm
                            ? "Create new User"
                            : "Update your username before you proceed."}
                    </h1>
                    <button
                        onClick={onClose}
                        className="absolute p-1 rounded-full text-[#FE6100] cursor-pointer top-3 right-3 hover:bg-gray-300"
                    >
                        <X />
                    </button>
                </div>

                {/* Step 1: Search existing username */}
                {!showCreateForm && (
                    <>
                        <div className="flex justify-center gap-6 items-center my-6">
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

                            <Button
                                onClick={updateUserName}
                                className="bg-[#FE6100]"
                                disabled={!isValidUsername}
                            >
                                Update
                            </Button>
                        </div>

                        <h1 className="text-sm text-gray-600">
                            If your desired username is not in the above list,
                            then{" "}
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="text-[#FE6100] cursor-pointer underline font-medium"
                            >
                                create it here
                            </button>
                            .
                        </h1>
                    </>
                )}

                {/* Step 2: Create new username */}
                {showCreateForm && (
                    <AddUser
                        setShowCreateForm={setShowCreateForm}
                        pastUsername={pastUsername}
                        redirectAfterSuccess={true}
                        redirectTarget={
                            tripId ? { tripId, expectedFileName } : undefined
                        }
                    />
                )}
            </div>
        </div>
    );
};

export default UsernameUpdate;
