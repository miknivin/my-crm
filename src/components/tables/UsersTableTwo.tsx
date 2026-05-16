
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import ShortSpinnerPrimary from "../ui/loaders/ShortSpinnerPrimary";
// import EditIcon from "../ui/flowbiteIcons/EditIcon";
import Link from "next/link";
import { useGetTeamMembersQuery } from '@/app/redux/api/userApi';

const UsersTableTwo: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [search, setSearch] = useState("");
  const limit = 10; // Fixed limit

  const { data, error, isLoading } = useGetTeamMembersQuery({
    page: 1, // Fixed to page 1 since no pagination
    limit,
    search,
  });

  const calculateRatio = (closedContacts: number, assignedContacts: number): string => {
    if (
      typeof closedContacts === 'number' &&
      typeof assignedContacts === 'number' &&
      assignedContacts > 0
    ) {
      return (closedContacts / assignedContacts).toFixed(2);
    }
    return '0.00';
  };

//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearch(e.target.value);
//   };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-2 px-5 py-2 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 text-start">Users</h3>
        <Link
          href="/users"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        >
          See all
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-5 py-3">User</th>
              <th scope="col" className="px-5 py-3">Created at</th>
              <th scope="col" className="px-5 py-3">Assigned</th>
              <th scope="col" className="px-5 py-3">Closed</th>
              <th scope="col" className="px-5 py-3">Conversion</th>
              {/* <th scope="col" className="px-5 py-3">Action</th> */}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={6} className="px-5 py-4 text-center">
                  <div className="w-full flex justify-center">
                    <ShortSpinnerPrimary />
                  </div>
                </td>
              </tr>
            )}
            {error && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={6} className="px-5 py-4 text-center text-red-500">
                  Error: {(error as any).data?.error || "Failed to fetch users"}
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.users.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={6} className="px-5 py-4 text-center">
                  No users found
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              data?.users.map((user: any) => (
                <tr
                  key={user._id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                >
                  <td className="px-5 py-4">
                    <div>
                      <span className="block text-gray-800 text-sm dark:text-white/90">
                        {user.name || 'N/A'}
                      </span>
                      <span className="block text-gray-500 text-xs dark:text-gray-400">
                        {user.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                    <span className="block">
                      {new Date(user.createdAt).toLocaleTimeString()}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block">
                      {user.assignedContacts || 0}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block">
                      {user.closedContacts || 0}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block">
                      {calculateRatio(user.closedContacts, user.assignedContacts)}
                    </span>
                  </td>
                  {/* <td className="px-5 py-4">
                    <div className="flex flex-wrap">
                      <Link
                        href={`/users/${user._id}`}
                        type="button"
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-2.5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                      >
                        <EditIcon />
                      </Link>
                    </div>
                  </td> */}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* {data && (
        <div className="px-5 py-3 text-gray-800 dark:text-white/90 flex justify-between items-center">
          <div className="text-sm">
            {data.total} users
          </div>
        </div>
      )} */}
    </div>
  );
};

export default UsersTableTwo;