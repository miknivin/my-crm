/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import BasicPagination from "../ui/pagination/BasicPagination";
import ShortSpinnerPrimary from "../ui/loaders/ShortSpinnerPrimary";
import Select from "../form/Select";
import { ChevronDownIcon } from "@/icons";
// import EditIcon from "../ui/flowbiteIcons/EditIcon";
// import Link from "next/link";
import { useGetTeamMembersQuery } from '@/app/redux/api/userApi';

const UsersTableOne: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const { data, error, isLoading, isFetching } = useGetTeamMembersQuery({
    page,
    limit,
    search,
  });

  const options = [
    { value: "10", label: "10" },
    { value: "15", label: "15" },
    { value: "25", label: "25" },
    { value: "50", label: "50" },
  ];

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

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

  const handleLimitChange = (value: string) => {
    setLimit(parseInt(value, 10));
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-4 px-5 py-3 flex gap-3 justify-between">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={handleSearchChange}
          className="w-full max-w-xl rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <div className="relative">
          <Select
            options={options}
            defaultValue="10"
            placeholder="Items per page"
            onChange={handleLimitChange}
            className="dark:bg-dark-900"
          />
          <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
            <ChevronDownIcon />
          </span>
        </div>
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
            {(isLoading || isFetching) && (
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
                <td colSpan={5} className="px-5 py-4 text-center">
                  No users found
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              data?.users.map((user:any) => (
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

      {data && (
        <div className="px-5 py-3 text-gray-800 dark:text-white/90 flex justify-between items-center">
          <div className="text-sm">
            Page {data.page} of {data.totalPages} ({data.total} users)
          </div>
          <BasicPagination
            currentPage={data.page}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
            onPrev={() => handlePageChange(page - 1)}
            onNext={() => handlePageChange(page + 1)}
          />
        </div>
      )}
    </div>
  );
};

export default UsersTableOne;