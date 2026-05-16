/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCreateLeaveMutation } from "@/app/redux/api/calenderApi";
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import { useState } from "react";
import { toast } from "react-toastify";

interface AddLeaveFormProps {
  onClose: () => void;
}

export default function AddLeaveForm({ onClose }: AddLeaveFormProps) {
  const [formData, setFormData] = useState({
    leaveType: "" as "vacation" | "sick" | "personal" | "maternity" | "paternity" | "other",
    startDate: "",
    endDate: "",
    reason: "",
    durationType: "full-day" as "full-day" | "half-day" | "quarter-day",
    timeSlot: "" as string,
  });
  const [error, setError] = useState<string | null>(null);
  const [createLeave, { isLoading }] = useCreateLeaveMutation();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "leaveType") {
      setFormData((prev) => ({
        ...prev,
        leaveType: value as typeof prev.leaveType,
        startDate: "",
        endDate: "",
        timeSlot: "",
      }));
    } else if (name === "durationType") {
      setFormData((prev) => ({
        ...prev,
        durationType: value as typeof prev.durationType,
        endDate: value !== "full-day" ? prev.startDate : prev.endDate,
        timeSlot: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const today = new Date();
  const minDate = new Date(today.setDate(today.getDate() + 7));
  const minDateString = minDate.toISOString().split("T")[0];

  const restrictMinDate = formData.leaveType && !["sick"].includes(formData.leaveType);

  // Time slot options
  const timeSlotOptions = {
    "half-day": [
      { value: "09:00-13:00", label: "Morning (9:00 AM - 1:00 PM)" },
      { value: "14:00-18:00", label: "Afternoon (2:00 PM - 6:00 PM)" },
    ],
    "quarter-day": [
      { value: "09:00-11:00", label: "9:00 AM - 11:00 AM" },
      { value: "11:00-13:00", label: "11:00 AM - 1:00 PM" },
      { value: "14:00-16:00", label: "2:00 PM - 4:00 PM" },
      { value: "16:00-18:00", label: "4:00 PM - 6:00 PM" },
    ],
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  // Validate timeSlot for half-day and quarter-day
  if (formData.durationType !== "full-day" && !formData.timeSlot) {
    setError("Please select a time slot for the leave.");
    return;
  }

  // Validate startDate
  if (!formData.startDate || isNaN(new Date(formData.startDate).getTime())) {
    setError("Please select a valid start date.");
    return;
  }

  try {
    let startDateTime = formData.startDate;
    let endDateTime = formData.durationType === "full-day" ? formData.endDate : formData.startDate;

    if (formData.durationType !== "full-day" && formData.timeSlot) {
      // Parse time slot (e.g., "09:00-13:00" -> start: 09:00, end: 13:00)
      const [startTime, endTime] = formData.timeSlot.split("-");
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);

      // Validate parsed times
      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
        setError("Invalid time slot format.");
        return;
      }

      // Combine date and time
      const startDate = new Date(formData.startDate);
      startDate.setHours(startHour, startMinute, 0, 0);
      if (isNaN(startDate.getTime())) {
        setError("Invalid start date or time.");
        return;
      }
      startDateTime = startDate.toISOString();

      const endDate = new Date(formData.startDate);
      endDate.setHours(endHour, endMinute, 0, 0);
      if (isNaN(endDate.getTime())) {
        setError("Invalid end date or time.");
        return;
      }
      endDateTime = endDate.toISOString();
    }

    const response = await createLeave({
      leaveType: formData.leaveType,
      startDate: startDateTime,
      endDate: endDateTime,
      reason: formData.reason,
      durationType: formData.durationType,
    }).unwrap();
    console.log("Leave request created:", response);
    setFormData({
      leaveType: "" as "vacation" | "sick" | "personal" | "maternity" | "paternity" | "other",
      startDate: "",
      endDate: "",
      reason: "",
      durationType: "full-day",
      timeSlot: "",
    });
    onClose();
    toast.success("Leave request created successfully");
  } catch (err: any) {
    console.error("Error creating leave request:", err);
    setError(err.data?.message || "Failed to create leave request");
  }
};

  return (
    <>
      <h2 className="mb-6 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
        Request New Leave
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="leaveType"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Leave Type
          </label>
          <select
            id="leaveType"
            name="leaveType"
            value={formData.leaveType}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-brand-600"
            required
          >
            <option value="" disabled>
              Select leave type
            </option>
            <option value="vacation">Vacation</option>
            <option value="sick">Sick</option>
            <option value="personal">Personal</option>
            <option value="maternity">Maternity</option>
            <option value="paternity">Paternity</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="durationType"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Duration Type
          </label>
          <select
            id="durationType"
            name="durationType"
            value={formData.durationType}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400"
            required
          >
            <option value="full-day">Full Day</option>
            <option value="half-day">Half Day</option>
            <option value="quarter-day">Quarter Day</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="startDate"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Date
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            min={restrictMinDate ? minDateString : new Date().toISOString().split("T")[0]}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400"
            required
          />
        </div>
        {formData.durationType !== "full-day" && (
          <div>
            <label
              htmlFor="timeSlot"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              Time Slot
            </label>
            <select
              id="timeSlot"
              name="timeSlot"
              value={formData.timeSlot}
              onChange={handleInputChange}
              className="dark:bg-dark-900 h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400"
              required
            >
              <option value="" disabled>
                Select time slot
              </option>
              {(timeSlotOptions[formData.durationType] || []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {formData.durationType === "full-day" && (
          <div>
            <label
              htmlFor="endDate"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              min={formData.startDate || undefined}
              value={formData.endDate}
              onChange={handleInputChange}
              className="dark:bg-dark-900 h-11 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400"
              required
            />
          </div>
        )}
        <div>
          <label
            htmlFor="reason"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Reason
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            className="dark:bg-dark-900 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400"
            rows={4}
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <ShortSpinnerDark /> : "Submit Leave Request"}
          </Button>
        </div>
      </form>
    </>
  );
}