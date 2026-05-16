"use client";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import { RootState } from "@/app/redux/rootReducer";
import { useGetPipelineByIdQuery } from "@/app/redux/api/pipelineApi";
import KeywordSearch from "./elements/KeywordSearch";
import StageFilter from "./elements/StageFilter";
import SourceFilter from "./elements/SourceFilter";
import UserAssignmentFilter from "./elements/UserAssignmentFilter";
import FilterActions from "./elements/FilterActions";
import DateRangePickerUi from "@/components/ui/date/DateRangePicker";
import { IUser } from "@/app/models/User";
import ActivityFilter from "./elements/ActivityFilter";

interface ContactOffCanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FilterForm({ isOpen, onClose }: ContactOffCanvasProps) {
  const offCanvasRef = useRef<HTMLDivElement>(null);
  const { user } = useSelector((state: RootState) => state.user);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [source, setSource] = useState("");
  
  const [selectedActivities, setSelectedActivities] = useState<{ value: string; isNot: boolean }[]>([]);
  const [assignedTo, setAssignedTo] = useState<{ userId: string; isNot: boolean }[]>([]);
  const [stage, setStage] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [updatedAtStartDate, setUpdatedAtStartDate] = useState<string | null>(null);
  const [updatedAtEndDate, setUpdatedAtEndDate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<IUser[]>([]);
  const { data: pipelineData } = useGetPipelineByIdQuery(
    process.env.NEXT_PUBLIC_DEFAULT_PIPELINE || ""
  );
  const stages = pipelineData?.pipeline?.stages || [];

  useEffect(() => {
    if (!user) return;

    const keyword = searchParams.get("keyword") || "";
    const sourceParam = searchParams.get("source") || "";
    // const activityParam = searchParams.get("activity") || "";
    const stageParam = searchParams.get("stage") || "";
    const filterStr = searchParams.get("filter");

    let filter: {
      assignedTo?: { userId: string; isNot: boolean }[];
      createdAt?: { startDate: string; endDate: string };
      updatedAt?: { startDate: string; endDate: string };
      stage?: string;
      activities?: { value: string; isNot: boolean }[];
    } = {};
    try {
      if (filterStr) filter = JSON.parse(filterStr);
    } catch (e) {
      console.error("Invalid filter param:", e);
    }

    setKeyword(keyword);
    setSource(sourceParam);
    if (filter.activities && !hasUserInteracted) {
      setSelectedActivities(filter.activities);
    }
    setStage(stageParam);

    if (filter.createdAt) {
      setStartDate(filter.createdAt.startDate);
      setEndDate(filter.createdAt.endDate);
    }
    if (filter.updatedAt) {
      setUpdatedAtStartDate(filter.updatedAt.startDate);
      setUpdatedAtEndDate(filter.updatedAt.endDate);
    }
    if (filter.assignedTo && !hasUserInteracted) {
      setAssignedTo(filter.assignedTo);
    }
  }, [searchParams, user, hasUserInteracted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const filter = {
      ...(user?.role === "admin" && assignedTo.length > 0 && { assignedTo }),
      ...(startDate && endDate && { createdAt: { startDate, endDate } }),
      ...(updatedAtStartDate && updatedAtEndDate && {
        updatedAt: { startDate: updatedAtStartDate, endDate: updatedAtEndDate },
      }),
      ...(stage && { stage }),
      ...(selectedActivities.length > 0 && { activities: selectedActivities }),
    };

    const query = new URLSearchParams();
    query.set("page", "1");
    query.set("limit", searchParams.get("limit") || "10");
    if (keyword) query.set("keyword", keyword);
    if (source) query.set("source", source);
    if (stage) query.set("stage", stage);
    if (Object.keys(filter).length > 0) {
      query.set("filter", JSON.stringify(filter));
    }
   
    router.push(`?${query.toString()}`, { scroll: false });
    onClose();
    setIsSubmitting(false);
  };

  const handleClear = () => {
    setKeyword("");
    setSource("");
    setSelectedActivities([]);
    setStage("");
    setAssignedTo([]);
    setStartDate(null);
    setEndDate(null);
    setUpdatedAtStartDate(null);
    setUpdatedAtEndDate(null);
    setHasUserInteracted(false);
    setSelectedUsers([]);

    const query = new URLSearchParams();
    query.set("page", "1");
    query.set("limit", searchParams.get("limit") || "10");
    router.push(`?${query.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        offCanvasRef.current &&
        !offCanvasRef.current.contains(event.target as Node) &&
        isOpen &&
        !isSubmitting
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, isSubmitting]);

  const handleApplyCreatedAt = (dates: { startDate: string | null; endDate: string | null }) => {
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
  };

  const handleApplyUpdatedAt = (dates: { startDate: string | null; endDate: string | null }) => {
    setUpdatedAtStartDate(dates.startDate);
    setUpdatedAtEndDate(dates.endDate);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/70 transition-opacity" aria-hidden="true" />
      <div
        ref={offCanvasRef}
        className="fixed top-0 right-0 z-[999] h-dvh p-4 overflow-y-auto transition-transform bg-white w-90 dark:bg-gray-800 translate-x-0"
      >
        <div className="flex justify-between items-center mb-4">
          <h5 className="text-base font-semibold text-gray-500 dark:text-gray-400">
            Contact Filters
          </h5>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex items-center justify-center dark:hover:bg-gray-600 dark:hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <KeywordSearch value={keyword} onChange={setKeyword} disabled={isSubmitting} />

          <div className="mb-4">
            <DateRangePickerUi
              onApply={handleApplyUpdatedAt}
              label="Select date range (Updated at)"
              placeholder="Select date range"
              startDate={updatedAtStartDate}
              endDate={updatedAtEndDate}
              setStartDate={setUpdatedAtStartDate}
              setEndDate={setUpdatedAtEndDate}
            />
          </div>

          <div className="mb-4">
            <DateRangePickerUi
              onApply={handleApplyCreatedAt}
              label="Select date range (Created at)"
              placeholder="Select date range"
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
            />
          </div>

          <StageFilter value={stage} onChange={setStage} stages={stages} disabled={isSubmitting} />

          <SourceFilter value={source} onChange={setSource} disabled={isSubmitting} />

          <ActivityFilter
            selectedActivities={selectedActivities}
            onSelectedActivitiesChange={setSelectedActivities}
            disabled={isSubmitting}
          />

          {user?.role === "admin" && (
            <UserAssignmentFilter
              assignedTo={assignedTo}
              hasUserInteracted={hasUserInteracted}
              selectedUsers={selectedUsers}
              onSelectedUserChange={setSelectedUsers}
              onAssignedToChange={(newAssignments) => {
                setAssignedTo(newAssignments);
                setHasUserInteracted(true);
              }}
              disabled={isSubmitting}
            />
          )}

          <FilterActions onSubmit={handleSubmit} onClear={handleClear} isSubmitting={isSubmitting} />
        </form>
      </div>
    </>
  );
}

const CloseIcon = () => (
  <svg
    className="w-3 h-3"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 14 14"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
    />
  </svg>
);