"use client";
import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PhoneIcon from "@/components/ui/flowbiteIcons/Phone";
import EmailIcon from "@/components/ui/flowbiteIcons/Email";
import NotesIcon from "@/components/ui/flowbiteIcons/Notes";
import { useUpdateProbabilityMutation } from "@/app/redux/api/contactApi";
import VeryShortSpinnerPrimary from "@/components/ui/loaders/veryShortSpinnerPrimary";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
// import NotesAndTagsForm from "../../pipeline/NotesAndTagForm";
import { toast } from "react-toastify";
import DragGripIcon from "@/components/ui/flowbiteIcons/DragGrip";
import Link from "next/link";
import RedirectIcon from "@/components/ui/flowbiteIcons/Redirect";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/rootReducer";
import TaskTabs from "@/components/pipeline/TaskTabs";
import { useSearchParams } from "next/navigation";
import InvoiceIcon from "@/components/ui/flowbiteIcons/InvoiceIcon";
import GenerateProposalForm from "../proposal-form/GenerateProposalForm";

interface Tag {
  user: string;
  name: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface AssignedTo {
  user: User;
  time: string; 
}

interface Contact {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  probability?: number;
  assignedTo?: AssignedTo[];
  notes?: string;
  tags?: Tag[];
  stageId?: string;
}

interface Stage {
  _id: string;
  name: string;
  order: number;
  probability: number;
}

interface SortableContactProps {
  contact: Contact;
  stages: Stage[];
  pipelineId: string;
  selectedStageFromParent:string;
  onStageChange: (contactId: string, stageId: string) => void;
}

function MobileContactCard({ contact, stages, onStageChange, selectedStageFromParent}: SortableContactProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `contact-${contact._id}`,
    data: { stageId: contact.stageId },
  });
  const searchParams = useSearchParams();
  const [probability, setProbability] = useState(contact.probability?.toString() || "50");
  const [initialProbability, setInitialProbability] = useState(contact.probability?.toString() || "50");
  const [selectedStage, setSelectedStage] = useState(contact.stageId || "");
  const [updateProbability, { isLoading: isProbabilityLoading }] = useUpdateProbabilityMutation();
  const { isOpen: isNotesModalOpen, openModal: openNotesModal, closeModal: closeNotesModal } = useModal();
  const { isOpen: isInvoiceModalOpen, openModal: openInvoiceModal, closeModal: closeInvoiceModal } = useModal();
  const [longPress, setLongPress] = useState(false);

  const { user } = useSelector((state: RootState) => state.user);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: transform ? 0.8 : 1,
  };
  const currentQuery = Object.fromEntries(searchParams);
  const newQuery = {
    ...currentQuery,
    fromPipeline: true,
  };
  const handlePhoneClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); 


    if (longPress || !contact.phone) {
      return;
    }

    const sanitizedPhone = contact.phone.replace(/[^+\d]/g, ''); 
    window.location.href = `tel:${sanitizedPhone}`;
  };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let longPressTimeout:any;
  const handleTouchStart = () => {
  // Start a timer for long press (e.g., 800ms)
  longPressTimeout = setTimeout(() => {
    setLongPress(true);
    if (contact.phone) {
      // Open WhatsApp in a new tab
      window.open(`https://wa.me/${contact.phone}?text=Hello`, '_blank');
    }
  }, 800);
};

  const handleTouchEnd = () => {
    // Clear the timeout if touch ends before long press
    clearTimeout(longPressTimeout);
    setLongPress(false);
  };

  const handleEmailClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (contact.email) {
      window.location.href = `mailto:${contact.email}`;
    }
  };

  const handleProbabilitySlide = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProbability(e.target.value);
    
  };

  const handleProbabilityChange = async (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    e.stopPropagation();
    
    const newProbability = parseInt(probability);
    if (newProbability.toString() === initialProbability) {
      return; // No change, skip mutation
    }

    try {
      await updateProbability({
        id: contact._id,
        probability: newProbability,
      }).unwrap();
      setInitialProbability(probability); // Update initial value after successful mutation
      toast.success("Probability updated successfully");
    } catch (error) {
      console.error("Failed to update probability:", error);
      setProbability(initialProbability); // Revert to initial value on error
      toast.error("Failed to update probability");
    }
  };

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newStageId = e.target.value;
    setSelectedStage(newStageId);
    onStageChange(contact._id, newStageId);
  };
  const isAdmin = user && user.role === "admin";
  const canGenerateProposal = user && ["admin", "team_member"].includes(user.role);
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      {selectedStageFromParent!=="all"&&(
        <div {...listeners} className="absolute top-[-8px] right-[-8px] z-50 rounded-md p-2 bg-blue-700 cursor-move text-white touch-none">
        <DragGripIcon />
      </div>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-8">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {contact.name || "Unnamed"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {contact.businessName || "Nil"}
            </p>
            <a
              href={`tel:${contact.phone}`}
              className="text-xs underline text-gray-500 dark:text-gray-400"
              onClick={(e) => e.stopPropagation()}
            >
              {contact.phone || "No phone"}
            </a>
             {isAdmin&&(
              <p className="text-xs text-blue-500 dark:text-blue-400">
                {contact?.assignedTo?.map((assigned) => assigned.user.name).join(", ") || "None"}
              </p>
               )}
          </div>
          <div className="relative">
            <select
              value={selectedStage}
              onChange={handleStageChange}
              className="appearance-none bg-transparent border border-gray-300 rounded-md px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              {[...stages]
                .sort((a, b) => a.order - b.order)
                .map((stage) => (
                  <option key={stage._id} value={stage._id}>
                    {stage.name}
                  </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex gap-2">
            {contact.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-blue-400 border border-blue-400"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePhoneClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd} // Handle cases where touch is interrupted
              className={`flex items-center px-3 py-1 text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded-md hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700 ${
                !contact.phone ? "opacity-50 cursor-not-allowed" : ""
              }`}
              aria-label={`Call ${contact.name || "contact"}`}
            >
              <PhoneIcon />
            </button>
            <button
              type="button"
              onClick={handleEmailClick}
              disabled={!contact.email}
              className={`flex items-center px-3 py-1 text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded-md hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700 ${
                !contact.email ? "opacity-50 cursor-not-allowed" : ""
              }`}
              aria-label={`Email ${contact.name || "contact"}`}
            >
              <EmailIcon />
            </button>
            <button
              type="button"
              onClick={openNotesModal}
              className="flex items-center px-3 py-1 text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded-md hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
              aria-label={`View notes and tags for ${contact.name || "contact"}`}
            >
              <NotesIcon />
            </button>
            {canGenerateProposal && (
              <button
                type="button"
                onClick={openInvoiceModal}
                className="flex items-center px-3 py-1 text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded-md hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                aria-label={`Generate proposal for ${contact.name || "contact"}`}
              >
                <InvoiceIcon className="w-4 h-4" />
              </button>
            )}
            <Link
              href={{
                pathname: `/contacts/${contact._id || "684fbbf3a1b0e8eda0c7cfa4"}`,
                query: newQuery,
              }}
              className="flex items-center px-3 py-1 text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded-md hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
            >
              <RedirectIcon  />
            </Link>
            
          </div>
          <div className="flex items-center gap-3">
            <input
                id={`probability-range-${contact._id}`}
                type="range"
                min="0"
                max="100"
                value={probability}
                onChange={handleProbabilitySlide}
                onTouchEnd={handleProbabilityChange} // Add touch support for finalizing value
                onMouseUp={handleProbabilityChange} // Keep for desktop compatibility
                disabled={isProbabilityLoading}
                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer dark:bg-gray-700"
              />
            <label
              htmlFor={`probability-range-${contact._id}`}
              className="text-sm font-medium text-gray-900 dark:text-white min-w-[50px] text-right"
            >
              {isProbabilityLoading ? <VeryShortSpinnerPrimary /> : `${probability}%`}
            </label>
          </div>
        </div>
      </div>
      <Modal isOpen={isNotesModalOpen} onClose={closeNotesModal} className="max-w-[400px] p-6">
        <TaskTabs contact={contact} onClose={closeNotesModal} />
      </Modal>
      <Modal isOpen={isInvoiceModalOpen} onClose={closeInvoiceModal} className="max-w-[700px] p-6 lg:p-10">
        <GenerateProposalForm
          contact={{ _id: contact._id, name: contact.name || "Client" }}
          onClose={closeInvoiceModal}
        />
      </Modal>
    </div>
  );
}

export default MobileContactCard;
