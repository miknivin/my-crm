"use client";
import React from "react";
import PhoneIcon from "@/components/ui/flowbiteIcons/Phone";
import EmailIcon from "@/components/ui/flowbiteIcons/Email";
import TagIcon from "@/components/ui/flowbiteIcons/TagIcon";

interface Contact {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface ContactDragOverlayProps {
  contact: Contact;
}

function ContactDragOverlay({ contact }: ContactDragOverlayProps) {
  return (
    <div
      className="mb-2 rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 shadow-md"
      style={{ opacity: 0.8 }}
      role="presentation"
      aria-label={`Dragging contact: ${contact.name || "Unnamed"}`}
    >
      <div className="flex justify-start items-start flex-col">
        {/* Contact info */}
        <div className="w-full text-left">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {contact.name || "Unnamed"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {contact.phone || "No phno"}
          </p>
        </div>
        {/* Button group - visually consistent but non-interactive */}
        <div className="inline-flex rounded-md shadow-xs my-2" role="group">
          <button
            type="button"
            disabled
            className={`inline-flex items-center px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border border-gray-900 rounded-s-lg dark:border-white dark:text-white ${
              !contact.phone ? "opacity-50 cursor-not-allowed" : "opacity-75"
            }`}
            aria-label={`Call ${contact.name || "contact"} (disabled)`}
          >
            <PhoneIcon />
          </button>
          <button
            type="button"
            role="button"
            disabled
            className={`inline-flex items-center px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border-t border-b border-gray-900 dark:border-white dark:text-white ${
              !contact.email ? "opacity-50 cursor-not-allowed" : "opacity-75"
            }`}
            aria-label={`Email ${contact.name || "contact"} (disabled)`}
          >
            <EmailIcon />
          </button>
          <button
            type="button"
            role="button"
            disabled
            className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border border-gray-900 rounded-e-lg dark:border-white dark:text-white opacity-75"
            aria-label={`View tags for ${contact.name || "contact"} (disabled)`}
          >
            <TagIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContactDragOverlay;