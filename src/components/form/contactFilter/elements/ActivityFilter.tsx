import React, { useState } from "react";
import Chip from "@/components/ui/chips/Chip";

export const activityOptions = [
  { value: "HAD_CONVERSATION", label: "Had Conversation" },
  { value: "CALLED_NOT_PICKED", label: "Called Not Picked" },
  { value: "CALLED_INVALID", label: "Called Invalid" },
  { value: "CALLED_SWITCHED_OFF", label: "Called Switched Off" },
  { value: "WHATSAPP_COMMUNICATED", label: "WhatsApp Communicated" },
  { value: "ONLINE_MEETING_SCHEDULED", label: "Online Meeting Scheduled" },
  { value: "OFFLINE_MEETING_SCHEDULED", label: "Offline Meeting Scheduled" },
  { value: "ONLINE_MEETING_CONFIRMED", label: "Online Meeting Confirmed" },
  { value: "OFFLINE_MEETING_CONFIRMED", label: "Offline Meeting Confirmed" },
  { value: "PROPOSAL_SHARED", label: "Proposal Shared" },
  { value: "PAYMENT_DONE_ADVANCE", label: "Payment Done Advance" },
  { value: "PAYMENT_DONE_PENDING", label: "Payment Done Pending" },
  { value: "FULL_PAYMENT_DONE", label: "Full Payment Done" },
  { value: "PAYMENT_DONE_MONTHLY", label: "Payment Done Monthly" },
  { value: "OTHER", label: "Other" },
  { value: "NO_ACTIVITY_RECORDED", label: "No activity recorded" },
];

interface Activity {
  value: string;
  label: string;
}

interface ActivityFilterProps {
  selectedActivities: { value: string; isNot: boolean }[];
  onSelectedActivitiesChange: (newActivities: { value: string; isNot: boolean }[]) => void;
  disabled?: boolean;
}

export default function ActivityFilter({
  selectedActivities,
  onSelectedActivitiesChange,
  disabled,
}: ActivityFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNot, setIsNot] = useState(false);

  const filteredActivities = activityOptions.filter((activity) =>
    activity.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsDropdownOpen(e.target.value.length > 0);
  };

  const handleSelectActivity = (activity: Activity) => {
    if (!selectedActivities.some((a) => a.value === activity.value)) {
      const newActivities = [...selectedActivities, { value: activity.value, isNot }];
      onSelectedActivitiesChange(newActivities);
    }
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleRemoveActivity = (value: string) => {
    const newActivities = selectedActivities.filter((a) => a.value !== value);
    onSelectedActivitiesChange(newActivities);
  };

  return (
    <div className="mb-4 relative">
      <div className="flex justify-between mb-2">
        <label htmlFor="activity-search" className="block text-sm font-medium text-gray-900 dark:text-white">
          Search activities
        </label>
        <NotToggle isNot={isNot} onChange={setIsNot} />
      </div>

      <input
        type="text"
        id="activity-search"
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder="Search activities"
        value={searchQuery}
        onChange={handleSearchChange}
        onFocus={() => setIsDropdownOpen(true)}
        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
        disabled={disabled}
      />

      {selectedActivities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedActivities.map((activity) => {
            const activityOption = activityOptions.find((opt) => opt.value === activity.value);
            return (
              <Chip
                key={activity.value}
                text={activityOption?.label || activity.value}
                onRemove={() => handleRemoveActivity(activity.value)}
                disabled={disabled}
                isNot={activity.isNot}
              />
            );
          })}
        </div>
      )}

      {isDropdownOpen && (
        <ActivityDropdown
          activities={filteredActivities}
          selectedActivities={selectedActivities}
          onSelectActivity={handleSelectActivity}
          disabled={disabled}
        />
      )}
    </div>
  );
}

const NotToggle = ({ isNot, onChange }: { isNot: boolean; onChange: (value: boolean) => void }) => (
  <label className="inline-flex items-center cursor-pointer">
    <span className="me-1 text-sm font-medium text-gray-900 dark:text-gray-300">Not</span>
    <input
      type="checkbox"
      checked={isNot}
      className="sr-only peer"
      onChange={(e) => onChange(e.target.checked)}
    />
    <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600" />
  </label>
);

const ActivityDropdown = ({
  activities,
  selectedActivities,
  onSelectActivity,
  disabled,
}: {
  activities: Activity[];
  selectedActivities: { value: string; isNot: boolean }[];
  onSelectActivity: (activity: Activity) => void;
  disabled?: boolean;
}) => (
  <div className="z-50 absolute mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-full dark:bg-gray-700 dark:divide-gray-600 max-h-56 overflow-y-auto">
    <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
      {activities.length > 0 ? (
        activities
          .filter((activity) => !selectedActivities.some((a) => a.value === activity.value))
          .map((activity) => (
            <li key={activity.value}>
              <button
                type="button"
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                onClick={() => onSelectActivity(activity)}
                disabled={disabled}
              >
                {activity.label}
              </button>
            </li>
          ))
      ) : (
        <li className="block px-4 py-2">No activities found</li>
      )}
    </ul>
  </div>
);