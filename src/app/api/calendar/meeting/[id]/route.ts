import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { isAuthenticatedUser, authorizeRoles } from '@/app/api/middlewares/auth';
import { ICalendarEvent } from '@/components/calendar/Calendar';
import dbConnect from '@/app/lib/db/connection';
import CalendarEvent from '@/app/models/CalendarEvents';


export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const event: Partial<ICalendarEvent> = await request.json();

    const user = await isAuthenticatedUser(request);
    authorizeRoles(user, 'admin', 'team_member');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    // Find and update the event
    const updatedEvent = await CalendarEvent.findByIdAndUpdate(
      id,
      {
        title: event.title,
        start: event.start,
        end: event.end || event.start,
        allDay: event.allDay ?? true,
        extendedProps: event.extendedProps ? { calendar: event.extendedProps.calendar } : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      return NextResponse.json({ error: 'CalendarEvent not found' }, { status: 404 });
    }

    const responseEvent = {
      id: updatedEvent._id.toString(),
      title: updatedEvent.title,
      start: updatedEvent.start,
      end: updatedEvent.end,
      allDay: updatedEvent.allDay,
      extendedProps: updatedEvent.extendedProps,
    };

    return NextResponse.json({ message: 'CalendarEvent updated successfully', data: responseEvent }, { status: 200 });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event', details: (error as Error).message },
      { status: (error as Error).message.includes('login') || (error as Error).message.includes('Not allowed') ? 401 : 500 }
    );
  }
}

// GET: Retrieve a CalendarEvent by ID
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await context.params;

    // Authenticate user and check roles
    const user = await isAuthenticatedUser(request);
    authorizeRoles(user, 'admin', 'team_member');

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    // Find the event
    const event = await CalendarEvent.findById(id);

    if (!event) {
      return NextResponse.json({ error: 'CalendarEvent not found' }, { status: 404 });
    }

    const responseEvent = {
      id: event._id.toString(),
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      extendedProps: event.extendedProps,
    };

    return NextResponse.json({ message: 'CalendarEvent retrieved successfully', data: responseEvent }, { status: 200 });
  } catch (error) {
    console.error('Error retrieving event:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve event', details: (error as Error).message },
      { status: (error as Error).message.includes('login') || (error as Error).message.includes('Not allowed') ? 401 : 500 }
    );
  }
}
