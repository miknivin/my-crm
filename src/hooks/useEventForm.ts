import { useState, useEffect } from "react";
import { ICalendarEvent } from '@/components/calendar/Calendar';

interface EventFormState {
  eventTitle: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLevel: string;
  errors: { title?: string; startDate?: string; level?: string };
}

export const useEventForm = (selectedEvent: ICalendarEvent | null) => {
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [errors, setErrors] = useState<EventFormState["errors"]>({});

  // Format date to YYYY-MM-DD in IST timezone
  const formatDateToLocal = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    // Adjust for IST (UTC+5:30)
    const istOffset = 5.5 * 60; // IST offset in minutes
    const localDate = new Date(date.getTime() + istOffset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  };

  // Populate form fields when editing an event
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (selectedEvent) {
      const formattedStart = selectedEvent.start ? formatDateToLocal(selectedEvent.start) : today;
      const formattedEnd = selectedEvent.end ? formatDateToLocal(selectedEvent.end) : "";

      setEventTitle(selectedEvent.title || "");
      setEventStartDate(formattedStart);
      setEventEndDate(formattedEnd);
      setEventLevel(selectedEvent.extendedProps?.calendar || "Primary");
      setErrors({});
    } else {
      resetForm();
    }
  }, [selectedEvent]);

  const resetForm = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("Primary"); // Set default level to Primary
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: EventFormState["errors"] = {};
    if (!eventTitle.trim()) newErrors.title = "Event title is required";
    if (!eventStartDate) newErrors.startDate = "Start date is required";
    if (!eventLevel) newErrors.level = "Event color is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
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
  };
};