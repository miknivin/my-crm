"use client";
import React, { useState, useEffect } from "react";
import Badge from "../ui/badge/Badge";
import { useGetContactsQuery, ResponseContact } from "@/app/redux/api/contactApi";
import BasicPagination from "../ui/pagination/BasicPagination";
import ShortSpinnerPrimary from "../ui/loaders/ShortSpinnerPrimary";
import Select from "../form/Select";
import { ChevronDownIcon } from "@/icons";
import EditIcon from "../ui/flowbiteIcons/EditIcon";
import { toast } from "react-toastify";
import AddToPipelineIcon from "../ui/flowbiteIcons/AddToPipeline";
import { checkBoxClass } from "@/constants/classnames";
import { Modal } from "../ui/modal";
import AddToPipelineForm from "../form/contact-form/AddToPipelineForm";
import AssignContactsForm from "../form/contact-form/AssignForm";
import { useModal } from "@/hooks/useModal";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import AssignUserIcon from "../ui/flowbiteIcons/Assign";
import { RootState } from '@/app/redux/rootReducer';
import { useSelector } from "react-redux";
import GenerateProposalForm from "../form/proposal-form/GenerateProposalForm";
import InvoiceIcon from "../ui/flowbiteIcons/InvoiceIcon";

export interface FilterParams {
  assignedTo?: { userId: string; isNot: boolean }[];
  pipelineNames?: string[];
  tags?: string[];
  source?: string;
  activities?: { value: string; isNot: boolean }[];
  createdAt?: {
    startDate?: string;
    endDate?: string;
  };
  updatedAt?: {
    startDate?: string;
    endDate?: string;
  };
  stage?: string;
}

const ContactTableOne: React.FC = () => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const { isOpen, openModal, closeModal } = useModal();
  const [limit, setLimit] = useState("10");
  const [modalType, setModalType] = useState<"addToPipeline" | "assignContacts" | "proposal" | null>(null);
  const [selectedProposalContact, setSelectedProposalContact] = useState<{ _id: string; name: string } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.user);
  const [params, setParams] = useState<{
    page: number;
    limit: number;
    keyword: string;
    filter: FilterParams;
  }>({
    page: 1,
    limit: 10,
    keyword: "",
    filter: {},
  });

  // Initialize params from query parameters on mount
  useEffect(() => {
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const keyword = searchParams.get("keyword") || "";
    const source = searchParams.get("source") || "";
    const stage = searchParams.get("stage") || "";
    const filterStr = searchParams.get("filter");
    const limitParam = searchParams.get("limit") || "10";
    setLimit(limitParam);

    let filter: FilterParams = {};
    try {
      if (filterStr) {
        filter = JSON.parse(filterStr);
      }
    } catch (e) {
      console.error("Invalid filter param:", e);
    }

    // Validate page and limit
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validLimit = isNaN(limit) || !["10", "15", "25", "50"].includes(limit.toString())
      ? 10
      : limit;

    setParams((prev) => ({
      ...prev,
      page: validPage,
      limit: validLimit,
      keyword,
      filter: {
        ...prev.filter,
        ...filter,
        source: source || filter.source || undefined,
        activities: Array.isArray(filter.activities) ? filter.activities : undefined,
        stage: stage || filter.stage || undefined,
        assignedTo: Array.isArray(filter.assignedTo) ? filter.assignedTo : undefined,
        createdAt: filter.createdAt || undefined,
        updatedAt: filter.updatedAt || undefined,
      },
    }));
  }, [searchParams]);

  // Update URL query params when page, limit, or keyword change
  useEffect(() => {
    const query = new URLSearchParams();
    query.set("page", params.page.toString());
    query.set("limit", params.limit.toString());
    if (params.keyword) query.set("keyword", params.keyword);
    if (params.filter.source) query.set("source", params.filter.source);
    if (params.filter.stage) query.set("stage", params.filter.stage);
    if (Object.keys(params.filter).length) query.set("filter", JSON.stringify(params.filter));
    router.push(`?${query.toString()}`, { scroll: false });
  }, [params, router]);

  const { data, error, isLoading, isFetching } = useGetContactsQuery(params);

  const options = [
    { value: "10", label: "10" },
    { value: "15", label: "15" },
    { value: "25", label: "25" },
    { value: "50", label: "50" },
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams((prev) => ({ ...prev, keyword: e.target.value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const handlePrevPage = () => {
    if (params.page > 1) {
      setParams((prev) => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleNextPage = () => {
    if (data?.pagination.totalPages && params.page < data.pagination.totalPages) {
      setParams((prev) => ({ ...prev, page: params.page + 1 }));
    }
  };

  const handleCheckboxChange = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allContactIds = data?.contacts?.map((contact) => contact._id as string) || [];
      setSelectedContacts((prev) => [...new Set([...prev, ...allContactIds])]);
    } else {
      const currentPageIds = data?.contacts?.map((contact) => contact._id as string) || [];
      setSelectedContacts((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    }
  };

  const handleAddToPipeline = () => {
    if (selectedContacts.length > 0) {
      setModalType("addToPipeline");
      openModal();
    } else {
      toast.error("Please select at least one contact");
    }
  };

  const handleAssignContacts = () => {
    if (selectedContacts.length > 0) {
      setModalType("assignContacts");
      openModal();
    } else {
      toast.error("Please select at least one contact");
    }
  };

  const handleLimitChange = (value: string) => {
    setParams((prev) => ({ ...prev, limit: parseInt(value), page: 1 }));
  };

  const handleProposalOpen = (contact: ResponseContact) => {
    setSelectedProposalContact({ _id: contact._id, name: contact.name });
    setModalType("proposal");
    openModal();
  };

  // Clear selections after form submission
  const handleFormSubmit = () => {
    setSelectedContacts([]);
    setModalType(null);
    closeModal();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getErrorMessage = (error: any): string => {
    if (!error) return "Unknown error";
    if ("status" in error) {
      return `Error ${error.status}: ${JSON.stringify(error.data) || "Unknown error"}`;
    }
    return error.message || "Unknown error";
  };

  const isButtonGroupDisabled = selectedContacts.length === 0;
  const isAllSelected =
    (data?.contacts?.length ?? 0) > 0 &&
    data?.contacts?.every((contact) => selectedContacts.includes(contact._id));

  const isAdmin = user && user.role === "admin";
  const canGenerateProposal = user && ["admin", "team_member"].includes(user.role);
  const columnCount = (isAdmin ? 1 : 0) + 1 + 1 + 1 + (isAdmin ? 1 : 0) + 1 + 1 + (canGenerateProposal ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-2 px-5 py-3 flex gap-3 justify-between">
        <input
          type="text"
          placeholder="Search contacts..."
          value={params.keyword}
          onChange={handleSearch}
          className="w-full max-w-xl rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <div className="relative flex gap-3">
          {user && user.role === "admin" && (
            <div className="inline-flex rounded-md shadow-xs" role="group">
              <button
                type="button"
                onClick={handleAddToPipeline}
                disabled={isButtonGroupDisabled}
                className={`px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-s-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white ${
                  isButtonGroupDisabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <AddToPipelineIcon />
              </button>
              <button
                type="button"
                onClick={handleAssignContacts}
                disabled={isButtonGroupDisabled}
                className={`px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-b border-gray-200 rounded-e-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white ${
                  isButtonGroupDisabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <AssignUserIcon />
              </button>
            </div>
          )}
          <Select
            options={options}
            value={limit}
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
      <div className="relative overflow-x-auto max-h-[calc(110vh-200px)]">
        {selectedContacts && selectedContacts.length > 0 && (
          <h3 className="text-sm mb-1 px-5 font-semibold text-gray-800 dark:text-white/90 text-start">
            {selectedContacts.length} contacts selected
          </h3>
        )}
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
            <tr>
              {isAdmin && (
                <th scope="col" className="px-3 py-2 w-12">
                  <input
                    type="checkbox"
                    className={`${checkBoxClass}`}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              <th scope="col" className="px-3 py-2">
                Contact
              </th>
              <th scope="col" className="px-3 py-2">
                Phone number
              </th>
              <th scope="col" colSpan={1} className="px-3 py-2 ">
                Tags
              </th>
              {isAdmin && (
                <th scope="col" className="px-3 py-2">
                  Assigned
                </th>
              )}
              <th scope="col" className="px-3 py-2">
                Created at
              </th>
              <th scope="col" className="px-3 py-2">
                Notes
              </th>
              {canGenerateProposal && (
                <th scope="col" className="px-3 py-2">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {(isLoading || isFetching) && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={columnCount} className="px-5 py-4 text-center">
                  <div className="w-full flex justify-center">
                    <ShortSpinnerPrimary />
                  </div>
                </td>
              </tr>
            )}
            {error && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={columnCount} className="px-5 py-4 text-center text-red-500">
                  {getErrorMessage(error)}
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.contacts?.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={columnCount} className="px-5 py-4 text-center">
                  No contacts found
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              data?.contacts?.map((contact: ResponseContact) => (
                <tr
                  key={contact._id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                >
                  {isAdmin && (
                    <td className="px-3 py-2 w-12">
                      <input
                        type="checkbox"
                        className={`${checkBoxClass}`}
                        checked={selectedContacts.includes(contact._id)}
                        onChange={() => handleCheckboxChange(contact._id)}
                      />
                    </td>
                  )}
                  <th
                    scope="row"
                    className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block font-medium text-gray-800 text-sm dark:text-white/90">
                          {contact.name}
                        </span>
                        <span className="block text-gray-500 text-xs dark:text-gray-400">
                          {contact.email}
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className="px-3 py-2">{contact.phone}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1 max-w-[130px] whitespace-break-spaces">
                      {contact.tags.length > 0 ? (
                        contact.tags.map((tag, index) => (
                          <Badge key={index} size="sm" color="info">
                            {tag.name}
                          </Badge>
                        ))
                      ) : (
                        <span>None</span>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <div className="max-w-36 line-clamp-3">
                        {contact.assignedTo.length > 0
                          ? contact.assignedTo
                              .map((assignment) =>
                                typeof assignment.user === "object" && assignment.user !== null && "name" in assignment.user
                                  ? (assignment.user as { name: string }).name
                                  : "Unknown"
                              )
                              .join(", ")
                          : "None"}
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <div className="max-w-36 line-clamp-3">
                      {new Date(contact.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="max-w-36 whitespace-normal break-words line-clamp-3">
                      {contact.notes || "No notes"}
                    </div>
                  </td>
                  {canGenerateProposal && (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap">
                        {isAdmin && (
                          <Link
                            href={`contacts/${contact._id}`}
                            className="text-white flex justify-center items-center bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-2.5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                            title="Edit Contact"
                          >
                            <EditIcon />
                          </Link>
                        )}
                        {canGenerateProposal && (
                          <button
                            type="button"
                            onClick={() => handleProposalOpen(contact)}
                            className="text-white bg-gray-900 hover:bg-black focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-2.5 py-2.5 me-2 mb-2 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none dark:focus:ring-gray-700"
                            title="Generate Proposal"
                          >
                            <InvoiceIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {data?.pagination && (
        <div className="px-5 py-3 text-gray-800 dark:text-white/90 flex justify-between items-center">
          <div className="text-sm">
            Page {data.pagination.page} of {data.pagination.totalPages} (
            {data.pagination.total} contacts)
          </div>
          <BasicPagination
            currentPage={params.page}
            totalPages={data.pagination.totalPages}
            onPageChange={handlePageChange}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
          />
        </div>
      )}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] p-6 lg:p-10">
        {modalType === "addToPipeline" && (
          <AddToPipelineForm selectedContacts={selectedContacts} onClose={handleFormSubmit} />
        )}
        {modalType === "assignContacts" && (
          <AssignContactsForm selectedContacts={selectedContacts} onClose={handleFormSubmit} />
        )}
        {modalType === "proposal" && selectedProposalContact && (
          <GenerateProposalForm
            contact={selectedProposalContact}
            onClose={() => {
              setSelectedProposalContact(null);
              setModalType(null);
              closeModal();
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default ContactTableOne;
