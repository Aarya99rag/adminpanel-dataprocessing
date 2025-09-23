"use client";
import { Button } from "@/components/ui/button";
import { EyeClosed, EyeIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { addUser, getOfficeNames } from "@/apis/operations/rasta360";
import { useRouter } from "next/navigation";

interface AddUserProps {
    setShowCreateForm: (show: boolean) => void;
    pastUsername?: string;
    redirectAfterSuccess?: boolean;
    redirectTarget?: { tripId: string; expectedFileName?: string };
    onUserAdded?: (createdUsername?: string) => void;
    onUserCreated?: (username: string) => void;
}

interface Office {
    office_id: string;
    office_name: string;
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

    const [offices, setOffices] = useState<Office[]>([]);
    const [open, setOpen] = useState(false);
    const [officeId, setOfficeId] = useState("");

    const router = useRouter();

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    useEffect(() => {
        const fetchOffices = async () => {
            if (form.office_name.length >= 2) {
                try {
                    const response = await getOfficeNames(form.office_name);
                    setOffices(response.data || []);
                    setOpen(true);
                } catch (err) {
                    console.error("error fetching offices", err);
                }
            } else {
                setOffices([]);
                setOpen(false);
            }
        };

        const debounce = setTimeout(fetchOffices, 400);
        return () => clearTimeout(debounce);
    }, [form.office_name]);

    const handleSelectOffice = (office: Office) => {
        setForm({ ...form, office_name: office.office_name });
        setOfficeId(office.office_id);
        setOpen(false);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await addUser({
                ...form,
                pastUsername,
                office_id: officeId,
            });
            if (response.data.success) {
                toast.success("User created successfully!");
                setShowCreateForm(false);

                const tripId = redirectTarget?.tripId;
                const expectedFileName = redirectTarget?.expectedFileName;
                if (tripId && expectedFileName) {
                    router.push(
                        `/rasta360/uploadVid?tripID=${encodeURIComponent(
                            tripId
                        )}&fileName=${encodeURIComponent(expectedFileName)}`
                    );
                }

                onUserCreated?.(form.username);
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
                {/* render all fields except office_name normally */}
                {Object.keys(form).map((field) =>
                    field === "office_name" ? (
                        <div key={field} className="flex flex-col relative">
                            <label className="text-sm font-medium mb-1 capitalize">
                                Office Name
                            </label>
                            <input
                                type="text"
                                placeholder="Search office..."
                                name="office_name"
                                value={form.office_name}
                                onChange={handleFormChange}
                                className="border px-3 py-2 rounded bg-gray-50 placeholder:text-sm"
                                autoComplete="off"
                                onFocus={() => {
                                    if (offices.length > 0) setOpen(true);
                                }}
                            />

                            {open && offices.length > 0 && (
                                <ul className="absolute top-full left-0 right-0 mt-1 border rounded bg-white shadow max-h-40 overflow-y-auto z-10">
                                    {offices.map((office) => (
                                        <li
                                            key={office.office_id}
                                            onMouseDown={() =>
                                                handleSelectOffice(office)
                                            }
                                            className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                                        >
                                            {office.office_name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : (
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
                                pattern={
                                    field === "phone" ? "[0-9]*" : undefined
                                }
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
                                    onClick={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    className="absolute cursor-pointer right-3 top-9 text-gray-500 hover:text-gray-700 text-sm"
                                >
                                    {showPassword ? <EyeClosed /> : <EyeIcon />}
                                </button>
                            )}
                        </div>
                    )
                )}

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
