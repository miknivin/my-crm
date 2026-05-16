import ArrowRightIcon from "@/components/ui/flowbiteIcons/ArrowRight";
import React from "react";

interface FilterActionsProps {
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
  isSubmitting?: boolean;
}

export default function FilterActions({ onSubmit, onClear, isSubmitting }: FilterActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        type="submit"
        onClick={onSubmit}
        disabled={isSubmitting}
        className={`px-4 py-2 flex items-center justify-center text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 ${
          isSubmitting ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isSubmitting ? "Applying..." : "Apply Filters"}
      </button>
      <button
        type="button"
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
        onClick={onClear}
        disabled={isSubmitting}
      >
        Clear Filters
        <ArrowRightIcon />
      </button>
    </div>
  );
}