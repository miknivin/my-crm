import React, { useState } from "react";
import { useGetTeamMembersQuery } from "@/app/redux/api/userApi";
import { IUser } from "@/app/models/User";
import Chip from "@/components/ui/chips/Chip";

interface UserAssignmentFilterProps {
  assignedTo: { userId: string; isNot: boolean }[];
  onAssignedToChange: (newAssignments: { userId: string; isNot: boolean }[]) => void;
  disabled?: boolean;
  hasUserInteracted: boolean;
  selectedUsers: IUser[];
  onSelectedUserChange: (newSelectedUsers: IUser[]) => void;
}

export default function UserAssignmentFilter({
  onSelectedUserChange,
  assignedTo,
  selectedUsers,
  onAssignedToChange,
  disabled,
}: UserAssignmentFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNot, setIsNot] = useState(false);

  const { data: teamMembersData, isLoading } = useGetTeamMembersQuery({
    page: 1,
    limit: 10,
    search: searchQuery,
  });
  const teamMembers: IUser[] = React.useMemo(() => teamMembersData?.users ?? [], [teamMembersData]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsDropdownOpen(e.target.value.length > 0);
  };

  const handleSelectMember = (member: IUser) => {
    if (member._id && !selectedUsers.some((user) => user._id === member._id)) {
      const newSelectedUsers = [...selectedUsers, member];
      const newAssignments = [...assignedTo, { userId: member._id, isNot }];
      onSelectedUserChange(newSelectedUsers);
      onAssignedToChange(newAssignments);
    }
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleRemoveUser = (userId: string | undefined) => {
    if (userId) {
      const newSelectedUsers = selectedUsers.filter((user) => user._id !== userId);
      const newAssignments = assignedTo.filter((a) => a.userId !== userId);
      onSelectedUserChange(newSelectedUsers);
      onAssignedToChange(newAssignments);
    }
  };

  return (
    <div className="mb-4 relative">
      <div className="flex justify-between mb-2">
        <label htmlFor="simple-search" className="block text-sm font-medium text-gray-900 dark:text-white">
          Search users
        </label>
        <NotToggle isNot={isNot} onChange={setIsNot} />
      </div>
      
      <input
        type="text"
        id="simple-search"
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder="Search users"
        value={searchQuery}
        onChange={handleSearchChange}
        onFocus={() => setIsDropdownOpen(searchQuery.length > 0)}
        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
        disabled={disabled}
      />
      
      {selectedUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Chip
              key={user._id}
              text={user.name || ""}
              onRemove={() => handleRemoveUser(user._id)}
              disabled={disabled}
              isNot={assignedTo.find((a) => a.userId === user._id)?.isNot || false}
            />
          ))}
        </div>
      )}
      
      {isDropdownOpen && (
        <UserDropdown 
          isLoading={isLoading}
          teamMembers={teamMembers}
          selectedUsers={selectedUsers}
          onSelectMember={handleSelectMember}
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

const UserDropdown = ({
  isLoading,
  teamMembers,
  selectedUsers,
  onSelectMember,
  disabled,
}: {
  isLoading: boolean;
  teamMembers: IUser[];
  selectedUsers: IUser[];
  onSelectMember: (member: IUser) => void;
  disabled?: boolean;
}) => (
  <div className="z-50 absolute mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-full dark:bg-gray-700 dark:divide-gray-600">
    <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
      {isLoading ? (
        <li className="block px-4 py-2">Loading...</li>
      ) : teamMembers.length > 0 ? (
        teamMembers
          .filter((member) => !selectedUsers.some((user) => user._id === member._id))
          .map((member) => (
            <li key={member._id}>
              <button
                type="button"
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                onClick={() => onSelectMember(member)}
                disabled={disabled}
              >
                {member.name}
              </button>
            </li>
          ))
      ) : (
        <li className="block px-4 py-2">No users found</li>
      )}
    </ul>
  </div>
);