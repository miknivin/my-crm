/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import ShortSpinnerPrimary from "../ui/loaders/ShortSpinnerPrimary";
import EditIcon from "../ui/flowbiteIcons/EditIcon";
import { useGetLeavesQuery } from "@/app/redux/api/calenderApi";
import Badge from "../ui/badge/Badge";
import { useModal } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import EditLeaveForm from "../form/leave-form/EditLeave";
import Link from "next/link";

const LeavesTableTwo: React.FC = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const limit = 10; // Fixed limit
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);

  const { data, error, isLoading } = useGetLeavesQuery({ page: 1, limit });

  // Format date or date-time based on durationType
  const formatDate = (date: Date, includeTime: boolean): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Kolkata", // IST
    };
    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = false;
    }
    return new Intl.DateTimeFormat("en-IN", options).format(new Date(date));
  };

  const formatDateRange = (startDate: Date, endDate: Date, durationType?: string): string => {
    const includeTime = durationType === "half-day" || durationType === "quarter-day";
    const start = formatDate(startDate, includeTime);
    const end = formatDate(endDate, includeTime);
    return `${start} to ${end}`;
  };

  const handleEditClick = (id: string) => {
    setSelectedLeaveId(id);
    openModal();
  };

  const handleCloseModal = () => {
    setSelectedLeaveId(null);
    closeModal();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-2 px-5 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 text-start">Leaves</h3>
        <Link
          href="/leave-management"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        >
          See all
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-5 py-3">Employee</th>
              <th scope="col" className="px-5 py-3">Leave Type</th>
              <th scope="col" className="px-5 py-3">Duration Type</th>
              <th scope="col" className="px-5 py-3">Dates</th>
              <th scope="col" className="px-5 py-3">Reason</th>
              <th scope="col" className="px-5 py-3">Status</th>
              <th scope="col" className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={7} className="px-5 py-4 text-center">
                  <div className="w-full flex justify-center">
                    <ShortSpinnerPrimary />
                  </div>
                </td>
              </tr>
            )}
            {error && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={7} className="px-5 py-4 text-center text-red-500">
                  Error: {(error as any).data?.message || "Failed to fetch leave requests"}
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.leaves.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={7} className="px-5 py-4 text-center">
                  No leave requests found
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              data?.leaves.map((leave: any) => (
                <tr
                  key={leave.id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                >
                  <th
                    scope="row"
                    className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block font-medium text-gray-800 text-sm dark:text-white/90">
                          {leave.employeeName}
                        </span>
                        <span className="block text-gray-500 text-xs dark:text-gray-400">
                          {(leave.employeeId as any)?.email || "N/A"}
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className="px-5 py-4">
                    <span className="block text-sm text-gray-800 dark:text-white/90">
                      {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block text-sm text-gray-800 dark:text-white/90">
                      {leave.durationType || "N/A"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block">
                      {formatDateRange(new Date(leave.startDate), new Date(leave.endDate), leave.durationType)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="max-w-36 line-clamp-3">
                      {leave.reason || "N/A"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {leave.status === "rejected" && <Badge variant="light" color="error">{leave.status}</Badge>}
                    {leave.status === "approved" && <Badge variant="light" color="success">{leave.status}</Badge>}
                    {leave.status === "pending" && <Badge variant="light" color="warning">{leave.status}</Badge>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => handleEditClick(leave.id)}
                        className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-md text-sm px-2.5 py-2.5 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400"
                      >
                        <EditIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {selectedLeaveId && (
        <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[700px] p-6 lg:p-4">
          <EditLeaveForm id={selectedLeaveId} onClose={handleCloseModal} />
        </Modal>
      )}
    </div>
  );
};

export default LeavesTableTwo;