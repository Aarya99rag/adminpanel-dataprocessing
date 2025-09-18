"use client";
import { Button } from "@/components/ui/button";
import { EyeClosed, EyeIcon } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { addUser } from "@/apis/operations/rasta360";
import { useRouter } from "next/navigation";

interface AddUserProps {
    setShowCreateForm: (show: boolean) => void;
    pastUsername?: string;
    redirectAfterSuccess?: boolean;
    redirectTarget?: { tripId: string; expectedFileName?: string };
    onUserAdded?: (createdUsername?: string) => void;
    onUserCreated?: (username: string) => void;
}

const AddUser: React.FC<AddUserProps> = ({
    setShowCreateForm,
    pastUsername,
    redirectTarget,
    onUserCreated,
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({
        name: "",
        username: "",
        office_name: "",
        email: "",
        phone: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await addUser({ ...form, pastUsername });
            if (response.data.success) {
                toast.success("User created successfully!");
                setShowCreateForm(false);
                // redirect to upload page if tripId + fileName provided
                const tripId = redirectTarget?.tripId;
                const expectedFileName = redirectTarget?.expectedFileName;
                if (tripId && expectedFileName) {
                    router.push(
                        `/rasta360/uploadVid?tripID=${encodeURIComponent(
                            tripId
                        )}&fileName=${encodeURIComponent(expectedFileName)}`
                    );
                }
                if (onUserCreated) {
                    onUserCreated(form.username); // send back the created username
                }
            } else {
                toast.error(response.data.message || "Failed to create user");
            }
        } catch (err) {
            toast.error("Something went wrong while creating user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <form
                className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
                onSubmit={handleSubmit}
                autoComplete="off"
            >
                {Object.keys(form).map((field) => (
                    <div key={field} className="flex flex-col relative">
                        <label className="text-sm font-medium mb-1 capitalize">
                            {field.replace("_", " ")}
                        </label>

                        <input
                            type={
                                field === "password"
                                    ? showPassword
                                        ? "text"
                                        : "password"
                                    : field === "phone"
                                    ? "tel"
                                    : "text"
                            }
                            placeholder={`Enter ${field.replace("_", " ")}`}
                            name={field}
                            value={form[field as keyof typeof form]}
                            onChange={(e) => {
                                if (field === "phone") {
                                    const numeric = e.target.value.replace(
                                        /\D/g,
                                        ""
                                    );
                                    setForm({ ...form, phone: numeric });
                                } else {
                                    handleFormChange(e);
                                }
                            }}
                            required
                            pattern={field === "phone" ? "[0-9]*" : undefined}
                            inputMode={
                                field === "phone" ? "numeric" : undefined
                            }
                            maxLength={field === "phone" ? 10 : undefined}
                            className="border px-3 py-2 rounded bg-gray-50 pr-10 placeholder:text-sm placeholder:capitalize"
                            autoComplete="new-password"
                        />

                        {field === "password" && (
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute cursor-pointer right-3 top-9 text-gray-500 hover:text-gray-700 text-sm"
                            >
                                {showPassword ? <EyeClosed /> : <EyeIcon />}
                            </button>
                        )}
                    </div>
                ))}

                <div className="col-span-2 flex justify-end gap-3 mt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateForm(false)}
                        disabled={loading}
                    >
                        Back
                    </Button>
                    <Button
                        type="submit"
                        className="bg-[#FE6100]"
                        disabled={loading}
                    >
                        {loading ? "Creating..." : "Create"}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AddUser;
