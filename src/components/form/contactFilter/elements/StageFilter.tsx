import React from "react";

interface StageFilterProps {
  value: string;
  onChange: (value: string) => void;
  stages: Array<{ _id: string; name: string }>;
  disabled?: boolean;
}

export default function StageFilter({ value, onChange, stages, disabled }: StageFilterProps) {
  return (
    <div className="mb-4">
      <label htmlFor="contact-stage" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
        Select stage
      </label>
      <select
        id="contact-stage"
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Choose a stage</option>
        {stages.map((stage) => (
          <option key={stage._id} value={stage._id}>
            {stage.name}
          </option>
        ))}
      </select>
    </div>
  );
}