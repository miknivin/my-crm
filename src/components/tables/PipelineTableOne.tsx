/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import React, { useState } from "react";
import BasicPagination from "../ui/pagination/BasicPagination";
import ShortSpinnerPrimary from "../ui/loaders/ShortSpinnerPrimary";
import Select from "../form/Select";
import { ChevronDownIcon } from "@/icons";
import EditIcon from "../ui/flowbiteIcons/EditIcon";
import { useGetPipelinesQuery } from "@/app/redux/api/pipelineApi";
import { formatDateTime } from "@/helpers/formatDate";
import Link from "next/link";
import EditPencilIcon from "../ui/flowbiteIcons/EditPencil";
import { Modal } from "../ui/modal";
import EditPipelineForm from "../form/pipeline-form/EditPipelineForm";

const PipelineTableOne: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const { data, error, isLoading } = useGetPipelinesQuery({
    page,
    limit,
    search,
    // Optional: Add createdFrom, createdTo if date filters are needed
    // createdFrom: "2025-01-01",
    // createdTo: new Date().toISOString().split("T")[0],
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

  const handleLimitChange = (value: string) => {
    setLimit(parseInt(value, 10));
    setPage(1); 
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const openModal = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    setIsModalOpen(true);
  };

  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPipelineId(null);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 ">
      <div className="mb-4 px-5 py-3 flex gap-3 justify-between">
        <input
          type="text"
          placeholder="Search pipelines..."
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
              <th scope="col" className="px-5 py-3">Pipeline</th>
              <th scope="col" className="px-5 py-3">User</th>
              <th scope="col" className="px-5 py-3">Created</th>
              <th scope="col" className="px-5 py-3">Notes</th>
              <th scope="col" className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={5} className="px-5 py-4 text-center">
                  <div className="w-full flex justify-center">
                    <ShortSpinnerPrimary />
                  </div>
                </td>
              </tr>
            )}
            {error && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={5} className="px-5 py-4 text-center text-red-500">
                  Error: {(error as any).data?.error || "Failed to fetch pipelines"}
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.pipelines.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={5} className="px-5 py-4 text-center">
                  No pipelines found
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              data?.pipelines.map((pipeline) => (
                <tr
                  key={pipeline._id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                >
                  <th
                    scope="row"
                    className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block font-medium text-gray-800 text-sm dark:text-white/90">
                          {pipeline.name}
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className="px-5 py-4">
                    <div>
                      <span className="block text-gray-800 text-sm dark:text-white/90">
                        {pipeline?.user?.name||"nil"}
                      </span>
                      <span className="block text-gray-500 text-xs dark:text-gray-400">
                        {pipeline?.user?.email || "nil"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                     {formatDateTime(new Date(pipeline.createdAt))
                      .split("\n")
                      .map((line, index) => (
                        <span key={index} className="block">
                          {line.trim()}
                        </span>
                      ))}
                  </td>
                  <td className="px-5 py-4">
                    <div className="max-w-36 line-clamp-3">
                      {pipeline.notes || "No notes"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap">
                      <Link
                        href={`/pipelines/${pipeline._id}`}
                        type="button"
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-2.5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                      >
                        <EditIcon />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openModal(pipeline._id)}
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-2.5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                      >
                        <EditPencilIcon />
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
            Page {data.page} of {data.totalPages} ({data.total} pipelines)
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
      <Modal isOpen={isModalOpen} onClose={closeModal} className="max-w-[700px] p-6 lg:p-10">
              <EditPipelineForm pipelineId={selectedPipelineId || ""} onClose={closeModal} />
        </Modal>
    </div>
  );
};

export default PipelineTableOne;