import React from "react";

const sourceOptions = [
  { value: "facebook", label: "Facebook Leads" },
  { value: "whatsApp", label: "WhatsApp" },
  { value: "Excel file", label: "Excel file" },
  { value: "manual", label: "Manual" },
];

interface SourceFilterProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function SourceFilter({ value, onChange, disabled }: SourceFilterProps) {
  return (
    <div className="mb-4">
      <label htmlFor="contact-source" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
        Select source
      </label>
      <select
        id="contact-source"
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Choose a source</option>
        {sourceOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}