
"use client";

import { IContact } from "@/app/models/Contact";
import Button from "@/components/ui/button/Button";
import VeryShortSpinnerPrimary from "@/components/ui/loaders/veryShortSpinnerPrimary";

interface FieldMapperProps {
  headers: string[];
  fieldMappings: Record<string, keyof IContact | "">;
  onMappingChange: (header: string, field: keyof IContact | "") => void;
  onNext: () => void;
  isFirstStep: boolean;
  onBack: () => void;
  onCancel: () => void;
  isCheckingDuplicates: boolean;
  error: string | null;
}

const contactFields: (keyof IContact)[] = [
  "name",
  "email",
  "phone",
  "notes",
  "businessName",
  "source",
  "probability",
  "value",
  "tags",
];

export default function FieldMapper({
  headers,
  fieldMappings,
  onMappingChange,
  onNext,
  onCancel,
  onBack,
  isFirstStep,
  isCheckingDuplicates,
  error,
}: FieldMapperProps) {
  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
        Map Headers to Fields
      </h3>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {headers.map((header) => (
          <div key={header} className="mb-4">
            <label
              htmlFor={`field-map-${header}`}
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              {header}
            </label>
            <select
              id={`field-map-${header}`}
              value={fieldMappings[header] || ""}
              onChange={(e) => onMappingChange(header, e.target.value as keyof IContact | "")}
              className="block w-full p-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
            >
              <option value="">Select Field</option>
              {contactFields.map((field) => (
                <option
                  key={field}
                  value={field}
                  disabled={Object.values(fieldMappings).includes(field) && fieldMappings[header] !== field}
                >
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        {!isFirstStep && (
          <Button type="button" onClick={onBack} variant="outline">
            Back
          </Button>
        )}
        <Button type="button" onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button type="button" onClick={onNext} variant="primary" disabled={isCheckingDuplicates}>
          {isCheckingDuplicates ? <VeryShortSpinnerPrimary /> : "Next"}
        </Button>
      </div>
    </div>
  );
}