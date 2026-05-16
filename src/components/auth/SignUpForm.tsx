"use client";
import { useRegisterMutation } from "@/app/redux/api/authApi";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { toast } from "react-toastify"; // Optional: for user feedback, install if needed
import { useRouter } from "next/navigation";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    password: "",
    phone: "",
  });
  const [register, { isLoading }] = useRegisterMutation();
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const name = `${formData.fname} ${formData.lname}`.trim();
      const payload = {
        name,
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
      };

      await register(payload).unwrap();
      toast.success("Registration successful!"); // Optional: user feedback
      router.push("/");
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "message" in error.data &&
        "success" in error.data
      ) {
        toast.error((error.data as { message: string }).message);
      }
      console.error("Registration error:", error);
      toast.error("Unexpected Error. Please try again."); // Optional: user feedback
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your details to sign up!
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* First Name */}
                  <div className="sm:col-span-1">
                    <Label>
                      First Name<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="fname"
                      name="fname"
                      placeholder="Enter your first name"
                      value={formData.fname}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  {/* Last Name */}
                  <div className="sm:col-span-1">
                    <Label>
                      Last Name<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="lname"
                      name="lname"
                      placeholder="Enter your last name"
                      value={formData.lname}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                {/* Email */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                {/* Phone */}
                <div>
                  <Label>
                    Phone Number<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="Enter your phone number (e.g., +1234567890)"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                {/* Password */}
                <div>
                  <Label>
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password"
                      type={showPassword ? "text"

 : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
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
                {/* Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Signing Up..." : "Sign Up"}
                  </button>
                </div>
              </div>
            </form>
            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Already have an account?
                <Link
                  href="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}