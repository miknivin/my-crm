import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Contact, { IContact } from '@/app/models/Contact';

import mongoose from 'mongoose';
import dbConnect from '@/app/lib/db/connection';
import { validateUpdatePipelineRequest } from '../../middlewares/validateContactUpdate';
import { logContactActivity } from '../../utils/activityLog';

interface UpdatePipelineRequest {
  contactIds: string[];
  pipelineId: string;
  stageId: string;
  userId: string; // The user performing the action
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    const body: UpdatePipelineRequest = await req.json();
    const validationResult = await validateUpdatePipelineRequest(body);

    // If validation fails, return the error response
    if (!validationResult.success) {
      return validationResult.response;
    }

    const { contacts } = validationResult;
    const { pipelineId, stageId, userId } = body;

    // Update each contact's pipelinesActive array
    const updatedContacts: IContact[] = [];
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (contacts) {
          for (const contact of contacts) {
            const existingPipeline = contact.pipelinesActive.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (pa:any) => pa.pipeline_id.toString() === pipelineId
            );

            if (existingPipeline) {
              // Update existing pipeline entry
              const oldStageId = existingPipeline.stage_id?.toString();
              existingPipeline.stage_id = new mongoose.Types.ObjectId(stageId);
              await contact.logActivity('PIPELINE_STAGE_UPDATED', new mongoose.Types.ObjectId(userId), {
                pipelineId,
                oldStageId,
                stageId,
              }, session);
              await logContactActivity({
                contactId: contact._id,
                event: 'PIPELINE_STAGE_CHANGED',
                description: 'Pipeline stage changed',
                performedBy: userId,
                metadata: { pipelineId, oldStage: oldStageId, newStage: stageId },
                session,
              });
            } else {
              // Add new pipeline entry
              contact.pipelinesActive.push({
                pipeline_id: new mongoose.Types.ObjectId(pipelineId),
                stage_id: new mongoose.Types.ObjectId(stageId),
              });
              await contact.logActivity('PIPELINE_ADDED', new mongoose.Types.ObjectId(userId), {
                pipelineId,
                stageId,
              }, session);
            }

            const updatedContact = await contact.save({ session });
            updatedContacts.push(updatedContact);
          }
        }
      });
    } finally {
      await session.endSession();
    }


    return NextResponse.json(
      {
        success: true,
        message: 'Contacts updated successfully',
        data: updatedContacts,
      },
      { status: 200 }
    );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to update contacts',
      },
      { status: 500 }
    );
  }
}
