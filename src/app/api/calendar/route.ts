import { NextRequest, NextResponse } from "next/server";
import CalendarEvent from "@/app/models/CalendarEvents";
import dbConnect from "@/app/lib/db/connection";
import { isAuthenticatedUser } from "../middlewares/auth";

// Interface for CalendarEvent to ensure type safety
interface ICalendarEvent {
  id?: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps: {
    calendar: string;
  };
  user?: string;
}

export async function GET() {
  try {
    await dbConnect();
    const events = await CalendarEvent.find({}).lean();

    const formattedEvents = events.map((event) => ({
      ...event,
      id: event._id!.toString(),
      _id: undefined,
    }));

    return NextResponse.json(formattedEvents, { status: 200 });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

// POST: Create a new event
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event: ICalendarEvent = await request.json();

    // Validate required fields
    if (!event.title || !event.start || !event.extendedProps?.calendar) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newEvent = new CalendarEvent({
      title: event.title,
      start: event.start,
      end: event.end || event.start,
      allDay: event.allDay ?? true,
      extendedProps: { calendar: event.extendedProps.calendar },
      user: user._id, // Add authenticated user's ID
    });

    const savedEvent = await newEvent.save();

    const responseEvent = {
      id: savedEvent._id.toString(),
      title: savedEvent.title,
      start: savedEvent.start,
      end: savedEvent.end,
      allDay: savedEvent.allDay,
      extendedProps: savedEvent.extendedProps,
      user: savedEvent.user.toString(),
    };

    return NextResponse.json(responseEvent, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

// PUT: Update an existing event
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event: ICalendarEvent = await request.json();

    // Validate required fields
    if (!event.id || !event.title || !event.start || !event.extendedProps?.calendar) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const eventId = event.id;
    const updatedEvent = await CalendarEvent.findByIdAndUpdate(
      eventId,
      {
        title: event.title,
        start: event.start,
        end: event.end || event.start,
        allDay: event.allDay ?? true,
        extendedProps: { calendar: event.extendedProps.calendar },
        user: user._id, // Update with authenticated user's ID
      },
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const responseEvent = {
      id: updatedEvent._id.toString(),
      title: updatedEvent.title,
      start: updatedEvent.start,
      end: updatedEvent.end,
      allDay: updatedEvent.allDay,
      extendedProps: updatedEvent.extendedProps,
      user: updatedEvent.user.toString(),
    };

    return NextResponse.json(responseEvent, { status: 200 });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}


// DELETE: Delete an event by _id
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { _id } = await request.json();

    if (!_id) {
      return NextResponse.json({ error: "Event _id is required" }, { status: 400 });
    }

    const result = await CalendarEvent.findByIdAndDelete(_id);

    if (!result) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Event deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}