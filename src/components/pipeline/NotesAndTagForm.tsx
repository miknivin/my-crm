"use client";
import React, { useState, useEffect } from "react";
import Chip from "@/components/ui/chips/Chip";
import { useUpdateContactNotesMutation, useGetContactNotesAndTagsQuery } from "@/app/redux/api/contactApi";
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";

interface Tag {
  user: string;
  name: string;
}

interface Contact {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: Tag[];
}

interface NotesAndTagsFormProps {
  contact: Contact;
  onClose: () => void;
}

function NotesAndTagsForm({ contact, onClose }: NotesAndTagsFormProps) {
  const { data, isLoading: isFetching, error } = useGetContactNotesAndTagsQuery(contact._id);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<{ name: string }[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState("");
  const [updateContactNotes, { isLoading }] = useUpdateContactNotesMutation();

  // Initialize notes and tags when query data is available
  useEffect(() => {
    if (data) {
      setNotes(data.notes || "");
      setTags(data.tags.map((tag) => ({ name: tag.name })) || []);
    } else if (!isFetching && !error) {
      // Fallback to contact prop if query fails or no data
      setNotes(contact.notes || "");
      setTags(contact.tags?.map((tag) => ({ name: tag.name })) || []);
    }
  }, [data, isFetching, error, contact]);

  const handleTagAdd = (tagName: string) => {
    const trimmedTag = tagName.trim();
    if (trimmedTag && !tags.some((tag) => tag.name === trimmedTag)) {
      if (tags.length >= 10) {
        setTagError("Maximum 10 tags allowed");
        return;
      }
      const newTag = { name: trimmedTag };
      const newTags = [...tags, newTag];
      setTags(newTags);
      setTagInput("");
      setTagError("");
    }
  };

  const handleTagRemove = (tagName: string) => {
    const newTags = tags.filter((t) => t.name !== tagName);
    setTags(newTags);
    setTagError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateContactNotes({
        id: contact._id,
        tags,
        notes,
      }).unwrap();
      onClose();
    } catch (error) {
      console.error("Failed to update contact:", error);
      setTagError("Failed to save changes");
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center h-40">
        <ShortSpinnerDark />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg text-start font-semibold text-gray-900 dark:text-white">
        Notes and Tags for {contact.name || "Contact"}
      </h2>
      
      {/* Notes Section */}
      <div>
        <label
          htmlFor="notes"
          className="mb-1.5 block text-start text-sm font-medium text-gray-700 dark:text-gray-400"
        >
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes..."
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          rows={4}
          maxLength={5000}
          aria-label="Add notes"
        />
      </div>

      {/* Tags Section */}
      <div>
        <label
          htmlFor="tags"
          className="mb-1.5 block text-sm text-start font-medium text-gray-700 dark:text-gray-400"
        >
          Tags (Optional)
        </label>
        <div
          className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus-within:border-brand-800"
          role="group"
          aria-label="Enter tags"
        >
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Chip key={tag.name} text={tag.name} onRemove={() => handleTagRemove(tag.name)} />
            ))}
          </div>
          <input
            id="tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                if (tagInput.trim()) {
                  handleTagAdd(tagInput);
                }
              }
            }}
            onBlur={() => {
              if (tagInput.trim()) {
                handleTagAdd(tagInput);
              }
            }}
            placeholder="Add a tag..."
            className="w-full outline-none text-sm text-gray-800 bg-transparent placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30"
            aria-label="Add new tag"
          />
          {tagError && <p className="text-red-500 text-sm mt-1">{tagError}</p>}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" onClick={onClose} variant="outline">
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? <ShortSpinnerDark /> : "Save Contact"}
        </Button>
      </div>
    </form>
  );
}

export default NotesAndTagsForm;