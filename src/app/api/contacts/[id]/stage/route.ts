/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import Contact from '@/app/models/Contact';
import Stage from '@/app/models/Stage';
import dbConnect from '@/app/lib/db/connection';
import { isAuthenticatedUser, authorizeRoles } from '@/app/api/middlewares/auth';
import { logContactActivity } from '@/app/api/utils/activityLog';

// Environment variable for the fixed pipeline ID
const DEFAULT_PIPELINE_ID = process.env.DEFAULT_PIPELINE || '6858217887f5899a7e6fc6f1';

// Interface for request body
interface UpdateStageRequest {
  stageId: string;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Authenticate user
    let user;
    try {
      user = await isAuthenticatedUser(request);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!user._id || !Types.ObjectId.isValid(user._id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 401 }
      );
    }
    const userId = user._id.toString();

    // Check user role
    let isAdmin = false;
    try {
      authorizeRoles(user, 'admin');
      isAdmin = true;
    } catch (error) {
      console.log('Admin authorization failed:', error);
      try {
        authorizeRoles(user, 'team_member');
      } catch (error) {
        console.log('Team member authorization failed:', error);
        return NextResponse.json(
          { success: false, error: 'User is neither admin nor team member' },
          { status: 401 }
        );
      }
    }

    // Get id from params
    const { id } = await context.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing contact ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body: UpdateStageRequest = await request.json();
    const { stageId } = body;

    // Validate stageId
    if (!stageId || !Types.ObjectId.isValid(stageId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing stage ID' },
        { status: 400 }
      );
    }

    // Find the contact based on role
    const contactQuery = isAdmin ? { _id: id } : { _id: id, 'assignedTo.user': user._id };
    const contact = await Contact.findOne(contactQuery);
    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found or unauthorized' },
        { status: 404 }
      );
    }

    // Find the pipeline entry in pipelinesActive
    const pipelineEntry = contact.pipelinesActive.find(
      (entry: { pipeline_id: Types.ObjectId }) =>
        entry.pipeline_id.toString() === DEFAULT_PIPELINE_ID
    );

    if (!pipelineEntry) {
      return NextResponse.json(
        { success: false, error: 'Contact is not associated with the specified pipeline' },
        { status: 400 }
      );
    }

    // Check if the stageId is valid for the pipeline
    const stage = await Stage.findOne({
      _id: stageId,
      pipeline_id: DEFAULT_PIPELINE_ID,
    });

    if (!stage) {
      return NextResponse.json(
        { success: false, error: 'Invalid stage ID for the specified pipeline' },
        { status: 400 }
      );
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const contactForUpdate = await Contact.findOne(contactQuery).session(session);
        if (!contactForUpdate) {
          throw new Error('Contact not found or unauthorized');
        }

        const pipelineEntryForUpdate = contactForUpdate.pipelinesActive.find(
          (entry: { pipeline_id: Types.ObjectId }) =>
            entry.pipeline_id.toString() === DEFAULT_PIPELINE_ID
        );
        if (!pipelineEntryForUpdate) {
          throw new Error('Contact is not associated with the specified pipeline');
        }

        const oldStageId = pipelineEntryForUpdate.stage_id.toString();
        pipelineEntryForUpdate.stage_id = new Types.ObjectId(stageId);

        await contactForUpdate.logActivity('PIPELINE_STAGE_UPDATED', new Types.ObjectId(userId), {
          pipelineId: DEFAULT_PIPELINE_ID,
          oldStageId,
          newStageId: stageId,
        }, session);

        await logContactActivity({
          contactId: contactForUpdate._id,
          event: 'PIPELINE_STAGE_CHANGED',
          description: 'Pipeline stage changed',
          performedBy: userId,
          metadata: {
            pipelineId: DEFAULT_PIPELINE_ID,
            oldStage: oldStageId,
            newStage: stageId,
          },
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    // Fetch updated contact with populated fields
    const updatedContact = await Contact.findById(id)
      .populate('assignedTo.user', 'name')
      .populate('tags.user', 'name')
      .populate('user', 'name')
      .populate('activities.user', 'name')
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: 'Contact stage updated successfully',
        contact: updatedContact,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating contact stage:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: error.message.includes('login') || error.message.includes('Not allowed') ? 401 : 500 }
    );
  }
}
