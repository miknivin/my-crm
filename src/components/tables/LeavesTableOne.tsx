/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import BasicPagination from "../ui/pagination/BasicPagination";
import ShortSpinnerPrimary from "../ui/loaders/ShortSpinnerPrimary";
import Select from "../form/Select";
import { ChevronDownIcon } from "@/icons";
import EditIcon from "../ui/flowbiteIcons/EditIcon";
import { useGetLeavesQuery } from "@/app/redux/api/calenderApi";
import Badge from "../ui/badge/Badge";
import { useModal } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import EditLeaveForm from "../form/leave-form/EditLeave";
import { toast } from "react-toastify";

const LeavesTableOne: React.FC = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);

  const { data, error, isLoading,isFetching } = useGetLeavesQuery({ page, limit, search });


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

  const options = [
    { value: "10", label: "10" },
    { value: "15", label: "15" },
    { value: "25", label: "25" },
    { value: "50", label: "50" },
  ];

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (value: string) => {
    setLimit(parseInt(value, 10));
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleEditClick = (id: string) => {
    setSelectedLeaveId(id);
    openModal();
  };

  const handleCloseModal = () => {
    setSelectedLeaveId(null);
    closeModal();
  };

  useEffect(() => {
    if (isFetching) {
      toast.loading("Fetching leave requests...", {
        toastId: "leaves-fetching",
        position: "top-right",
        autoClose: false,
      });
    } else {
      toast.dismiss("leaves-fetching");
    }

    // Cleanup toast on component unmount
    return () => {
      toast.dismiss("leaves-fetching");
    };
  }, [isFetching]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-4 px-5 py-3 flex gap-3 justify-between">
        <input
          type="text"
          placeholder="Search leave requests..."
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
                <td colSpan={10} className="px-5 py-4 text-center">
                  <div className="w-full flex justify-center">
                    <ShortSpinnerPrimary />
                  </div>
                </td>
              </tr>
            )}
            {error && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={10} className="px-5 py-4 text-center text-red-500">
                  Error: {(error as any).data?.message || "Failed to fetch leave requests"}
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.leaves.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={10} className="px-5 py-4 text-center">
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
                    <span className="block text-gray-800 text-sm dark:text-white/90">
                      {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block text-gray-800 text-sm dark:text-white/90">
                      {leave?.durationType || "N/A"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="block">
                      {formatDateRange(new Date(leave.startDate), new Date(leave.endDate), leave.durationType)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="max-w-36 line-clamp-3">
                      {leave.reason || "No reason provided"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {leave.status === "rejected" && <Badge variant="light" color="error">{leave.status}</Badge>}
                    {leave.status === "approved" && <Badge variant="light" color="success">{leave.status}</Badge>}
                    {leave.status === "pending" && <Badge variant="light" color="warning">{leave.status}</Badge>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap">
                      <button
                        onClick={() => handleEditClick(leave.id)}
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-2.5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
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

      {data && (
        <div className="px-5 py-3 text-gray-800 dark:text-white/90 flex justify-between items-center">
          <div className="text-sm">
            Page {data.page} of {data.totalPages} ({data.total} leave requests)
          </div>
          <BasicPagination
            currentPage={data.page}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
            onPrev={() => handlePageChange(data.page - 1)}
            onNext={() => handlePageChange(data.page + 1)}
          />
        </div>
      )}
      {selectedLeaveId && (
        <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[700px] p-6 lg:p-10">
          <EditLeaveForm id={selectedLeaveId} onClose={handleCloseModal} />
        </Modal>
      )}
    </div>
  );
};

export default LeavesTableOne;