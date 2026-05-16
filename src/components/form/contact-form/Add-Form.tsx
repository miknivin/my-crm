/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCreateContactMutation } from "@/app/redux/api/contactApi";
import Button from "@/components/ui/button/Button";
import Chip from "@/components/ui/chips/Chip";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from '@/app/redux/rootReducer';
import { toast } from "react-toastify";
import { useGetPipelineByIdQuery } from "@/app/redux/api/pipelineApi";

interface AddContactFormProps {
  onClose: () => void;
}

export default function AddContactForm({ onClose }: AddContactFormProps) {
  const { user } = useSelector((state: RootState) => state.user);
  const { data: pipelineData } = useGetPipelineByIdQuery(
    process.env.NEXT_PUBLIC_DEFAULT_PIPELINE || ""
  );
  const stages = pipelineData?.pipeline?.stages || [];
  const defaultStage = stages.find((stage: any) => stage.order === 1)?._id ||
                      (stages.length > 0 ? stages[0]._id : "");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    userId: user ? user._id : "",
    businessName: "",
    stage: defaultStage,
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [createContact, { isLoading }] = useCreateContactMutation();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagAdd = (value: string) => {
    const trimmedValue = value.trim();
    if (formData.tags.includes(trimmedValue)) {
      setTagError(`Tag "${trimmedValue}" already exists.`);
      return;
    }
    if (trimmedValue && !formData.tags.includes(trimmedValue)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmedValue] }));
      setTagInput("");
      setTagError(null);
    }
  };

  const handleTagRemove = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const generateRandomEmail = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomStr = '';
    for (let i = 0; i < 12; i++) {
      randomStr += chars[Math.floor(Math.random() * chars.length)];
    }
    return `contact-${randomStr}@example.com`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const emailToSubmit = formData.email.trim() || generateRandomEmail();
      const response = await createContact({
        ...formData,
        email: emailToSubmit,
        userId: formData.userId || "",
      }).unwrap();
      console.log("Contact created:", response.contact);
      setFormData({
        name: "",
        email: "",
        phone: "",
        notes: "",
        userId: formData.userId,
        businessName: "",
        stage: stages.length > 0 ? stages[0]._id : "",
        tags: [],
      });
      setTagInput("");
      onClose();
      toast.success("Contact added successfully");
    } catch (err: any) {
      setError(err.data?.error || "Failed to create contact");
    }
  };

  return (
    <>
    <div className="max-h-[80vh] overflow-y-auto">
      <h2 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
        Add New Contact
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
            required
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Email (Optional)
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
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
          />
        </div>
        <div>
          <label
            htmlFor="businessName"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Business Name
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>
        <div>
          <label
            htmlFor="tags"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Tags (Optional)
          </label>
          <div
            className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus-within:border-brand-800"
            role="group"
            aria-label="Enter tags"
          >
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <Chip key={tag} text={tag} onRemove={() => handleTagRemove(tag)} />
              ))}
            </div>
            <input
              id="tags"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (tagInput.trim()) {
                    handleTagAdd(tagInput);
                  }
                }
              }}
              onBlur={() => {
                if (tagInput.trim()) {
                  handleTagAdd(tagInput);
                }
              }}
              placeholder="Add a tag..."
              className="w-full outline-none text-sm text-gray-800 bg-transparent placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30"
              aria-label="Add new tag"
            />
            {tagError && <p className="text-red-500 text-sm mt-1">{tagError}</p>}
          </div>
        </div>
        <div>
          <label
            htmlFor="stage"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Stage
          </label>
          <select
            id="stage"
            name="stage"
            value={formData.stage}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            required
          >
            <option value="" disabled>
              Select a stage
            </option>
            {stages.map((stage: any) => (
              <option key={stage._id} value={stage._id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="notes"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            rows={4}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <ShortSpinnerDark /> : "Save Contact"}
          </Button>
        </div>
      </form>
    </div>

    </>
  );
}