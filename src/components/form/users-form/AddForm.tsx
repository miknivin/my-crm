"use client";
import { useAddTeamMemberMutation } from "@/app/redux/api/userApi";
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from '@/app/redux/rootReducer';
import { toast } from "react-toastify";
import { EyeCloseIcon, EyeIcon } from "@/icons";

interface AddTeamMemberFormProps {
  onClose: () => void;
}

export default function AddTeamMemberForm({ onClose }: AddTeamMemberFormProps) {
  const { user } = useSelector((state: RootState) => state.user);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    signupMethod: "Email/Password" as "OTP" | "Email/Password" | "OAuth",
    avatar: { public_id: "", url: "" },
    userId: user ? user._id : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [addTeamMember, { isLoading }] = useAddTeamMemberMutation();
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "avatar.public_id" || name === "avatar.url") {
      setFormData((prev) => ({
        ...prev,
        avatar: { ...prev.avatar, [name.split(".")[1]]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateIndianPhoneNumber = (phone: string): boolean => {
    // Indian phone numbers: 10 digits, starting with 6, 7, 8, or 9
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, '')); // Remove non-digits for validation
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!formData.email) {
      setError("Email is required");
      return;
    }
    if (!formData.phone) {
      setError("Phone is required");
      return;
    }
    if (!validateIndianPhoneNumber(formData.phone)) {
      setError("Please enter a valid Indian phone number (10 digits, starting with 6, 7, 8, or 9)");
      return;
    }
    if (formData.signupMethod === "Email/Password" && !formData.password) {
      setError("Password is required for Email/Password signup");
      return;
    }
    if (
      formData.avatar.public_id &&
      !formData.avatar.url ||
      !formData.avatar.public_id &&
      formData.avatar.url
    ) {
      setError("Avatar must include both public_id and url, or neither");
      return;
    }

    try {
      const payload = {
        name: formData.name || undefined,
        email: formData.email,
        phone: formData.phone,
        password:
          formData.signupMethod === "Email/Password"
            ? formData.password
            : undefined,
        signupMethod: formData.signupMethod,
        avatar:
          formData.avatar.public_id && formData.avatar.url
            ? formData.avatar
            : undefined,
      };
      const response = await addTeamMember(payload).unwrap();
      console.log("Team member created:", response.user);
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        signupMethod: "Email/Password",
        avatar: { public_id: "", url: "" },
        userId: formData.userId,
      });
      onClose();
      toast.success("Team member added successfully");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.data?.error || "Failed to create team member");
    }
  };

  return (
    <>
      <h2 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
        Add New Team Member
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
            placeholder="e.g., 9876543210"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              required={formData.signupMethod === "Email/Password"}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
            >
              {showPassword ? (
                <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
              ) : (
                <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
              )}
            </span>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <ShortSpinnerDark /> : "Save Team Member"}
          </Button>
        </div>
      </form>
    </>
  );
}