/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import Contact, { IContact, Tag } from '@/app/models/Contact';
import dbConnect from '@/app/lib/db/connection';
import { authorizeRoles, isAuthenticatedUser } from '../../../middlewares/auth';
import Pipeline from '@/app/models/Pipeline';
import User from '@/app/models/User';
import Stage from '@/app/models/Stage';

// Interface for request body
interface UpdateContactRequest {
  tags?: Tag[];
  notes?: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const currentUser: any = await isAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Authorize roles: admin or team_member
    try {
      authorizeRoles(currentUser, 'admin');
    } catch (error) {
      console.log(error)
      try {
        authorizeRoles(currentUser, 'team_member');
      } catch (error) {
        console.log(error);
        return NextResponse.json(
          { error: 'User is neither admin nor team_member' },
          { status: 401 }
        );
      }
    }

    // Connect to MongoDB
    Pipeline
    Stage
    await dbConnect();

    // Get contact ID from params
    const { id } = await context.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid contact ID' },
        { status: 400 }
      );
    }

    // Find the contact and select only notes and tags
    const contact = await Contact.findById(id).select('notes tags').lean();
    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Contact notes and tags retrieved successfully', notes: contact.notes, tags: contact.tags },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error retrieving contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH handler to update contact's tags and notes
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const currentUser = await isAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    User
    // Authorize roles: admin or team_member
    try {
       authorizeRoles(currentUser, 'admin');
    } catch (error) {
      console.log('Admin authorization failed:', error);
      try {
        authorizeRoles(currentUser, 'team_member');
      } catch (error) {
        console.log('Team member authorization failed:', error);
        return NextResponse.json(
          { error: 'User is neither admin nor team_member' },
          { status: 401 }
        );
      }
    }

    const userId = new Types.ObjectId(currentUser._id);
    Pipeline
    Stage
    // Connect to MongoDB
    await dbConnect();

    // Get contact ID from params
    const contactId = await context.params;
    if (!contactId && !Types.ObjectId.isValid(contactId)) {
      return NextResponse.json(
        { error: 'Invalid contact ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body: UpdateContactRequest = await request.json();
    const { tags, notes } = body;

    // Start a MongoDB session for transaction
    const dbSession = await mongoose.startSession();
    let contact: IContact | null = null;
    try {
      await dbSession.withTransaction(async () => {
        // Find the contact
        
        contact = await Contact.findById(contactId.id).session(dbSession);
        if (!contact) {
          throw new Error('Contact not found');
        }

        // Prepare update object
        const update: Partial<IContact> = {};
        const activities: Array<{
          action: IContact['activities'][number]['action'];
          details: Record<string, unknown>;
        }> = [];

        // Handle tags update
        if (tags !== undefined) {
          const oldTags = contact.tags.map((tag: Tag) => tag.name);
          const newTags = tags ? tags.map((tag) => tag.name) : [];

          // Identify added and removed tags
          const addedTags = newTags.filter((tag) => !oldTags.includes(tag));
          const removedTags = oldTags.filter((tag) => !newTags.includes(tag));

          // Clear existing tags and create new subdocuments
          contact.tags.splice(0, contact.tags.length);
          if (tags) {
            tags.forEach((tag) => {
              contact!.tags.push({
                user: tag.user || userId,
                name: tag.name,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any);
            });
          }

          // Log tag activities
          if (addedTags.length > 0) {
            activities.push({
              action: 'TAG_ADDED',
              details: { addedTags },
            });
          }
          if (removedTags.length > 0) {
            activities.push({
              action: 'TAG_REMOVED',
              details: { removedTags },
            });
          }
        }

        // Handle notes update
        if (notes !== undefined) {
          update.notes = notes;
          activities.push({
            action: contact.notes ? 'NOTE_UPDATED' : 'NOTE_ADDED',
            details: { newNotes: notes },
          });
        }

        // Update contact if there are changes
        if (Object.keys(update).length > 0 || activities.length > 0) {
          Object.assign(contact, update);
          
          // Log activities
          for (const activity of activities) {
            await contact.logActivity(activity.action, userId, activity.details, dbSession);
          }

          await contact.save({ session: dbSession });
        }
      });

      return NextResponse.json(
        { message: 'Contact updated successfully', contact },
        { status: 200 }
      );
    } finally {
      dbSession.endSession();
    }
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}