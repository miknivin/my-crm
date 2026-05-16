import DateRangePickerUi from "@/components/ui/date/DateRangePicker";
import React from "react";

interface DateRangeFiltersProps {
  createdAt: { startDate: string | null; endDate: string | null };
  updatedAt: { startDate: string | null; endDate: string | null };
  onCreatedAtChange: (dates: { startDate: string | null; endDate: string | null }) => void;
  onUpdatedAtChange: (dates: { startDate: string | null; endDate: string | null }) => void;
}

export default function DateRangeFilters({
  createdAt,
  updatedAt,
  onCreatedAtChange,
  onUpdatedAtChange,
}: DateRangeFiltersProps) {
  return (
    <>
      <div className="mb-4">
        <DateRangePickerUi
          onApply={onCreatedAtChange}
          label="Select date range (Created at)"
          placeholder="Select date range"
          startDate={createdAt.startDate}
          endDate={createdAt.endDate}
          setStartDate={(date: string | null) => onCreatedAtChange({ startDate: date, endDate: createdAt.endDate })}
          setEndDate={(date: string | null) => onCreatedAtChange({ startDate: createdAt.startDate, endDate: date })}
        />
        <DateRangePickerUi
          onApply={onUpdatedAtChange}
          label="Select date range (Updated at)"
          placeholder="Select date range"
          startDate={updatedAt.startDate}
          endDate={updatedAt.endDate}
          setStartDate={(date: string | null) => onUpdatedAtChange({ startDate: date, endDate: updatedAt.endDate })}
          setEndDate={(date: string | null) => onUpdatedAtChange({ startDate: updatedAt.startDate, endDate: date })}
        />
      </div>
    </>
  );
}