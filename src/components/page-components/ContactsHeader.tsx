/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Button from "@/components/ui/button/Button";
import { Modal } from "../ui/modal";
import { useModal } from "@/hooks/useModal";
import AddContactForm from "../form/contact-form/Add-Form";
import FilterIcons from "../ui/flowbiteIcons/Filter";
import ContactOffCanvas from "../ui/drawer/ContactOffCanvas";
import FileIcon from "../ui/flowbiteIcons/File";
import ContactImportStepper from "../form/contact-form/bulk-upload/ContactImportStepper";
import { useSearchParams } from "next/navigation";
import AiReportModalShell from "./AiReportModalShell";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/rootReducer";

export default function ContactsHeader() {
  const { isOpen: isAddModalOpen, openModal: openAddModal, closeModal: closeAddModal } = useModal();
  const { isOpen: isFilterOpen, openModal: openFilter, closeModal: closeFilter } = useModal();
  const { isOpen: isImportModalOpen, openModal: openImportModal, closeModal: closeImportModal } = useModal();
  const { isOpen: isAiReportModalOpen, openModal: openAiReportModal, closeModal: closeAiReportModal } = useModal();
  const searchParams = useSearchParams();
  const { user } = useSelector((state: RootState) => state.user);

  // Check for active filters, excluding empty filter object
  const filterStr = searchParams.get("filter");
  let filter: { [key: string]: any } = {};
  try {
    if (filterStr) filter = JSON.parse(filterStr);
  } catch (e) {
    console.error("Invalid filter param:", e);
  }
  const hasActiveFilters = !!(
    searchParams.get("keyword") ||
    searchParams.get("source") ||
    (filterStr && Object.keys(filter).length > 0)
  );
  const canAccessAiReport = !!user && ["admin", "team_member"].includes(user.role);

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-0 items-start justify-between lg:items-center w-full my-5">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 text-start">Contacts</h3>
        <div className="flex justify-between items-center gap-3 flex-wrap-reverse">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" endIcon={<FilterIcons />} onClick={() => openFilter()}>
              <div className="flex justify-center items-center gap-1">
                {hasActiveFilters && (
                  <span id="indicator" className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                )}
                <div>Filter</div>
              </div>
            </Button>
            {canAccessAiReport && (
              <Button size="sm" variant="outline" onClick={() => openAiReportModal()}>
                AI Report
              </Button>
            )}
            <Button size="sm" variant="outline" endIcon={<FileIcon />} onClick={() => openImportModal()}>
              Bulk import
            </Button>
            <Button onClick={() => openAddModal()} size="sm" variant="primary">
              Add contact +
            </Button>
          </div>
        </div>
      </div>
      <Modal isOpen={isImportModalOpen} onClose={closeImportModal} className="max-w-[700px] p-6 lg:p-10">
        <ContactImportStepper onClose={closeImportModal} />
      </Modal>
      <Modal isOpen={isAddModalOpen} onClose={closeAddModal} className="max-w-[700px] p-6 lg:p-10">
        <AddContactForm onClose={closeAddModal} />
      </Modal>
      <Modal
        isOpen={isAiReportModalOpen}
        onClose={closeAiReportModal}
        isFullscreen
        className="bg-white p-6 dark:bg-gray-900 lg:p-10"
      >
        <AiReportModalShell onClose={closeAiReportModal} />
      </Modal>
      <ContactOffCanvas isOpen={isFilterOpen} onClose={closeFilter} />
    </>
  );
}
