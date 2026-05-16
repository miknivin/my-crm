// src/components/form/event-form/UpdateEventForm.tsx
import React from "react";
import { useUpdateEventMutation, useDeleteEventMutation } from "@/app/redux/api/calenderApi";
import { toast } from "react-toastify";
import { useEventForm } from "@/hooks/useEventForm";
import { ICalendarEvent } from "@/components/calendar/Calendar";

interface UpdateEventFormProps {
  selectedEvent: ICalendarEvent;
  onSubmit: () => void;
  onDelete: () => void;
}

const calendarsEvents = {
  Danger: "danger",
  Success: "success",
  Primary: "primary",
  Warning: "warning",
};

const UpdateEventForm: React.FC<UpdateEventFormProps> = ({ selectedEvent, onSubmit, onDelete }) => {
  const {
    eventTitle,
    setEventTitle,
    eventStartDate,
    setEventStartDate,
    eventEndDate,
    setEventEndDate,
    eventLevel,
    setEventLevel,
    errors,
    validateForm,
    resetForm,
  } = useEventForm(selectedEvent);

  const [updateEvent] = useUpdateEventMutation();
  const [deleteEvent] = useDeleteEventMutation();
  console.log(eventStartDate,'start');
  console.log(eventEndDate, 'end');
  
  
  const handleSubmit = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      const eventData: ICalendarEvent = {
        id: selectedEvent.id,
        title: eventTitle,
        start: eventStartDate,
        end: eventEndDate || eventStartDate,
        allDay: true,
        extendedProps: { calendar: eventLevel },
      };

      await updateEvent(eventData).unwrap();
      toast.success("Event updated successfully");
      onSubmit();
      resetForm();
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEvent({ _id: selectedEvent.id }).unwrap();
      toast.success("Event deleted successfully");
      onDelete();
      resetForm();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  return (
    <div className="mt-8">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          Event Title
        </label>
        <input
          id="event-title"
          type="text"
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
          className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-500">{errors.title}</p>
        )}
      </div>
      <div className="mt-6">
        <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
          Event Color
        </label>
        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          {Object.entries(calendarsEvents).map(([key, value]) => (
            <div key={key} className="n-chk">
              <div className={`form-check form-check-${value} form-check-inline`}>
                <label
                  className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                  htmlFor={`modal${key}`}
                >
                  <span className="relative">
                    <input
                      className="sr-only form-check-input"
                      type="radio"
                      name="event-level"
                      value={key}
                      id={`modal${key}`}
                      checked={eventLevel === key}
                      onChange={() => setEventLevel(key)}
                    />
                    <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                      <span
                        className={`h-2 w-2 rounded-full bg-white ${
                          eventLevel === key ? "block" : "hidden"
                        }`}
                      ></span>
                    </span>
                  </span>
                  {key}
                </label>
              </div>
            </div>
          ))}
        </div>
        {errors.level && (
          <p className="mt-1 text-sm text-red-500">{errors.level}</p>
        )}
      </div>
      <div className="mt-6">
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          Enter Start Date
        </label>
        <div className="relative">
          <input
            id="event-start-date"
            type="date"
            value={eventStartDate}
            onChange={(e) => setEventStartDate(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          />
        </div>
        {errors.startDate && (
          <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>
        )}
      </div>
      <div className="mt-6">
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          Enter End Date
        </label>
        <div className="relative">
          <input
            id="event-end-date"
            type="date"
            value={eventEndDate}
            onChange={(e) => setEventEndDate(e.target.value)}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
        <button
          onClick={handleSubmit}
          type="button"
          className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
        >
          Update Changes
        </button>
        <button
          onClick={handleDelete}
          type="button"
          className="flex w-full justify-center rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 sm:w-auto"
        >
          Delete Event
        </button>
      </div>
    </div>
  );
};

export default UpdateEventForm;