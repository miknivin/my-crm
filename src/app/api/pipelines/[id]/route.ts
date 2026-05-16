/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db/connection';
import Pipeline from '@/app/models/Pipeline';
import Stage from '@/app/models/Stage';
import { isAuthenticatedUser, authorizeRoles } from '../../middlewares/auth';
import { z } from 'zod';
import mongoose from 'mongoose';

interface UpdateFields {
  name?: string;
  notes?: string | null;
  updated_at: Date;
}


const updatePipelineSchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  stages: z
    .array(
      z.object({
        stage_id: z.string().optional(), // Optional for new stages
        name: z.string().trim().min(3).max(50),
        order: z.number().int().min(0),
      })
    )
    .optional(),
});

const validatePipelineUpdate = (data: unknown) => {
  try {
    return { data: updatePipelineSchema.parse(data), error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { data: null, error: error.errors };
    }
    return { data: null, error: 'Invalid request body' };
  }
};

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await mongoose.startSession();
  try {
    await dbConnect();
    session.startTransaction();

    const user = await isAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Need to login' }, { status: 401 });
    }

    authorizeRoles(user, 'admin');


    const pipelineId =   (await context.params).id; 

    
    if (!pipelineId) {
      return NextResponse.json({ error: 'Pipeline ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validationResult = validatePipelineUpdate(body);
    if (validationResult.error) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    const { name = "", notes = "", stages = [] } = validationResult.data ?? {};

    const pipeline = await Pipeline.findById(pipelineId).session(session);
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    // Update pipeline fields
    const updateFields: UpdateFields = {
      updated_at: new Date(),
    };

    if (name) {
      updateFields.name = name.trim();
    }

    if (notes !== undefined) {
      updateFields.notes = notes ? notes.trim() : null;
    }

    await Pipeline.findByIdAndUpdate(pipelineId, { $set: updateFields }, { new: true, runValidators: true, session });

    // Upsert stages if provided
    let incomingStageIds: string[] = [];
    if (stages && stages.length > 0) {
      // Normalize stage orders to avoid conflicts (1-based indexing)
      const normalizedStages = stages
        .sort((a, b) => a.order - b.order)
        .map((stage, index) => ({ ...stage, order: index + 1 }));

      // Prepare bulk write operations for upsert
      const bulkOps = normalizedStages.map(
        (stage: { stage_id?: string; name: string; order: number }, index: number) => {
          const stageData = {
            pipeline_id: pipelineId,
            name: stage.name.trim(),
            order: stage.order,
            updated_at: new Date(),
          };

          if (stage.stage_id) {
            // Update existing stage by stage_id
            return {
              updateOne: {
                filter: { 
                  _id: new mongoose.Types.ObjectId(stage.stage_id), 
                  pipeline_id: pipelineId 
                },
                update: { $set: stageData },
                upsert: false, // Only update if exists
              },
            };
          } else {
            console.log('New stage:', stageData);
            // Insert new stage
            return {
              insertOne: {
                document: { ...stageData, created_at: new Date() },
              },
            };
          }
        }
      );

      // Execute bulk write and wait for response
      try {
        const bulkResult = await Stage.bulkWrite(bulkOps, { session });


        // Collect existing stage IDs from the payload
        incomingStageIds = normalizedStages
          .filter((stage: { stage_id?: string }) => stage.stage_id)
          .map((stage: { stage_id?: string }) => stage.stage_id)
          .filter((id): id is string => !!id);

        // Add newly inserted stage IDs to incomingStageIds
        Object.values(bulkResult.insertedIds).forEach((id) => {
          if (id) {
            incomingStageIds.push(id.toString());
          }
        });

        console.log('Updated incomingStageIds:', incomingStageIds);

        // Perform deleteMany after bulkWrite
        if (incomingStageIds.length > 0) {
          const deletedCount = await Stage.deleteMany(
            {
              pipeline_id: pipelineId,
              _id: { $nin: incomingStageIds },
            },
            { session }
          );
          console.log('Deleted stages count:', deletedCount.deletedCount);
        } else {
          console.log('Skipping deleteMany: No stages to delete');
        }
      } catch (bulkError) {
        console.error('Bulk write error:', bulkError);
        throw new Error('Failed to update stages');
      }
    }

    // Fetch updated pipeline with stages
    const finalPipeline = await Pipeline.findById(pipelineId).populate('user', 'name email').lean();
    const pipelineStages = await Stage.find({ pipeline_id: pipelineId }).sort({ order: 1 }).lean();

    await session.commitTransaction();
    return NextResponse.json({ pipeline: { ...finalPipeline, stages: pipelineStages } }, { status: 200 });
  } catch (error: unknown) {
    await session.abortTransaction();
    console.error('Error updating pipeline:', error);
    if (error instanceof Error) {
      if ('code' in error && error.code === 11000) {
        return NextResponse.json({ error: 'Pipeline name or stage name already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 });
  } finally {
    session.endSession();
  }
}