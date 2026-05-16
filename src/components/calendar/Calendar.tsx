/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { useGetEventsQuery } from "@/app/redux/api/calenderApi";
import EventForm from "../form/event-form/EventForm";
import UpdateEventForm from "../form/event-form/UpdateEventForm";

export interface ICalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps: {
    calendar: string;
  };
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<ICalendarEvent | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  // Fetch events using RTK Query
  const { data: events = [], isLoading } = useGetEventsQuery();

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedEvent(null); // Clear selected event for new event creation
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event as unknown as ICalendarEvent;
    setSelectedEvent(event);
    openModal();
  };

  const handleAddEventButtonClick = () => {
    setSelectedEvent(null); // Clear selected event for new event creation
    openModal();
  };

  const handleModalClose = () => {
    setSelectedEvent(null); // Clear selected event when closing modal
    closeModal();
  };

  const handleFormSubmit = () => {
    setSelectedEvent(null); // Clear selected event after submission
    closeModal();
  };

  const handleFormDelete = () => {
    setSelectedEvent(null); // Clear selected event after deletion
    closeModal();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="custom-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next addEventButton",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          customButtons={{
            addEventButton: {
              text: "Add Event +",
              click: handleAddEventButtonClick, // Use dedicated handler
            },
          }}
        />
      </div>
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose} // Use updated close handler
        className="max-w-[700px] p-6 lg:p-10"
      >
        <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
          <div>
            <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
              {selectedEvent ? "Edit Event" : "Add Event"}
            </h5>
          </div>
          {selectedEvent ? (
            <UpdateEventForm
              selectedEvent={selectedEvent}
              onSubmit={handleFormSubmit}
              onDelete={handleFormDelete}
            />
          ) : (
            <EventForm
              selectedEvent={null}
              onSubmit={handleFormSubmit}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;