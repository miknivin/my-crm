"use client";
import React, { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PhoneIcon from "@/components/ui/flowbiteIcons/Phone";
import EmailIcon from "@/components/ui/flowbiteIcons/Email";
// import { useUpdateProbabilityMutation } from "@/app/redux/api/contactApi";
// import VeryShortSpinnerPrimary from "../ui/loaders/veryShortSpinnerPrimary";
// import NotesAndTagsForm from "./NotesAndTagForm";
import RedirectIcon from "@/components/ui/flowbiteIcons/Redirect";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/rootReducer";
import { useSearchParams } from "next/navigation";
import { Contact } from "./types";
import InvoiceIcon from "../ui/flowbiteIcons/InvoiceIcon";
import TaskIcon from "../ui/flowbiteIcons/TaskIcon";
import AppTooltip from "../ui/tooltip/AppTooltip";

interface SortableContactProps {
  contact: Contact;
  data: { stageId: string };   // required for drag context
  onOpenTask?: (contact: Contact) => void;
  onOpenProposal?: (contact: Contact) => void;
  onOpenQR?: (contact: Contact) => void;
}

function SortableContactComponent({ contact, data, onOpenTask, onOpenProposal, onOpenQR }: SortableContactProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `contact-${contact._id}`,   // consistent ID format
    data,                           // pass stageId through
  });

  const searchParams = useSearchParams();
  const { user } = useSelector((state: RootState) => state.user);
  // const [probability, setProbability] = useState(contact.probability?.toString() || "50");
  // const [updateProbability, { isLoading }] = useUpdateProbabilityMutation();
  // useEffect(() => {
  //   setProbability(contact.probability?.toString() || "50");
  // }, [contact.probability]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: transform ? 0.8 : 1,
  };

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePhoneClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (contact.phone) {
      window.open(`https://wa.me/${contact.phone}?text=Hy`, '_blank');
    }
  };

  const handleEmailClick = () => {
    if (contact.email) {
      window.location.href = `mailto:${contact.email}`;
    }
  };

  // const handleProbabilitySlide = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setProbability(e.target.value);
  // };

  // const handleProbabilityChange = async () => {
  //   try {
  //     await updateProbability({
  //       id: contact._id,
  //       probability: parseInt(probability),
  //     }).unwrap();
  //   } catch (error) {
  //     console.error("Failed to update probability:", error);
  //     setProbability(contact.probability?.toString() || "50");
  //   }
  // };

  const isAdmin = user && user.role === "admin";
  const canGenerateProposal = user && ["admin", "team_member"].includes(user.role);
  const currentQuery = Object.fromEntries(searchParams);
  const newQuery = {
    ...currentQuery,
    fromPipeline: true,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="mb-2 rounded-md border border-gray-200 bg-white py-2 px-3 dark:border-gray-700 dark:bg-gray-800 hover:shadow-sm touch-manipulation"
      role="listitem"
      aria-label={`Contact: ${contact.name || "Unnamed"}`}
    >
      <div className="flex justify-start items-start flex-col">
        <div {...listeners} className="w-full cursor-move text-left">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {contact.name || "Unnamed"}
          </p>
          {/* <p className="text-xs text-gray-500 line-clamp-2 dark:text-gray-400">
            {contact.businessName || "Nil"}
          </p> */}
          <a href={`tel:${contact.phone}`} className="text-xs underline text-gray-500 line-clamp-2 dark:text-gray-400">
            {contact.phone || "Nil"}
          </a>
          {user && user.role === "admin" && (
            <p className="text-xs text-blue-500 dark:text-blue-400">
              {contact?.assignedTo?.map((assigned) => assigned.user.name).join(", ") || "None"}
            </p>
          )}

          {contact?.tags && contact.tags.length > 0 && (
            contact.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-blue-400 border border-blue-400 break-words"
              >
                {tag.name}
              </span>
            ))
          )}
        </div>

        <div className="flex flex-col justify-start items-start w-full">
          <div
            className="inline-flex rounded-md shadow-xs my-2"
            role="group"
            onMouseDown={stopPropagation}
            onTouchStart={stopPropagation}
          >
            <AppTooltip content={contact.phone ? "Open WhatsApp. Right click for QR." : "No phone"}>
              <button
                type="button"
                onClick={handlePhoneClick}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (contact.phone) {
                    onOpenQR?.(contact);
                  }
                }}
                className={`inline-flex items-center px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border border-gray-900 rounded-s-lg hover:bg-gray-200 hover:text-white focus:z-10 focus:ring-2 focus:ring-gray-500 focus:bg-gray-900 focus:text-white dark:border-white dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700 ${
                  !contact.phone ? "opacity-50 cursor-not-allowed" : ""
                }`}
                aria-label={`Call ${contact.name || "contact"}`}
              >
                <PhoneIcon />
              </button>
            </AppTooltip>
            <AppTooltip content={contact.email ? "Send email" : "No email"}>
              <button
                type="button"
                role="button"
                onClick={handleEmailClick}
                disabled={!contact.email}
                className={`inline-flex items-center border-r px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border-t border-b border-gray-900 hover:bg-gray-200 hover:text-white focus:z-10 focus:ring-2 focus:ring-gray-500 focus:bg-gray-900 focus:text-white dark:border-white dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700 ${
                  !contact.email ? "opacity-50 cursor-not-allowed" : ""
                } ${isAdmin ? "" : "border-r"}`}
              >
                <EmailIcon />
              </button>
            </AppTooltip>
            <AppTooltip content="Tasks">
              <button
                type="button"
                onClick={() => onOpenTask?.(contact)}
                className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border-t border-b border-gray-900 hover:bg-gray-200 hover:text-white focus:z-10 focus:ring-2 focus:ring-gray-500 focus:bg-gray-900 focus:text-white dark:border-white dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                aria-label={`View notes and tags for ${contact.name || "contact"}`}
              >
                <TaskIcon className="w-4 h-4"/>
              </button>
            </AppTooltip>
            {canGenerateProposal && (
              <AppTooltip content="Generate proposal">
                <button
                  type="button"
                  onClick={() => onOpenProposal?.(contact)}
                  className="inline-flex items-center border-l px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border-t border-b border-gray-900 hover:bg-gray-200 hover:text-white focus:z-10 focus:ring-2 focus:ring-gray-500 focus:bg-gray-900 focus:text-white dark:border-white dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                  aria-label={`Generate proposal for ${contact.name || "contact"}`}
                >
                  <InvoiceIcon className="w-4 h-4" />
                </button>
              </AppTooltip>
            )}
            <AppTooltip content="Open contact">
              <Link
                href={{
                  pathname: `/contacts/${contact._id || "684fbbf3a1b0e8eda0c7cfa4"}`,
                  query: newQuery,
                }}
                className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border border-gray-900 rounded-e-lg hover:bg-gray-200 hover:text-white focus:z-10 focus:ring-2 focus:ring-gray-500 focus:bg-gray-900 focus:text-white dark:border-white dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700"
              >
                <RedirectIcon />
              </Link>
            </AppTooltip>
          </div>
{/* 
          <div className="flex justify-between flex-row-reverse items-center gap-3 w-full">
            <label
              htmlFor={`probability-range-${contact._id}`}
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              {isLoading ? <VeryShortSpinnerPrimary /> : probability + "%"}
            </label>
            <input
              id={`probability-range-${contact._id}`}
              type="range"
              min="0"
              max="100"
              value={probability}
              onChange={handleProbabilitySlide}
              onMouseUp={handleProbabilityChange}
              onTouchEnd={handleProbabilityChange}
              disabled={isLoading}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div> */}
        </div>
      </div>
    </div>
  );
}

const areEqual = (prev: SortableContactProps, next: SortableContactProps) => {
  return prev.contact === next.contact && prev.data.stageId === next.data.stageId;
};

export default memo(SortableContactComponent, areEqual);
