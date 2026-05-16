/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/test/mix-stages/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/app/lib/db/connection';
import Contact from '@/app/models/Contact';
import Stage from '@/app/models/Stage';

export async function POST() {
  try {
    await dbConnect();

    const pipelineId = process.env.DEFAULT_PIPELINE;
    if (!pipelineId || !mongoose.isValidObjectId(pipelineId)) {
      return NextResponse.json({ error: 'Invalid or missing DEFAULT_PIPELINE' }, { status: 400 });
    }

    const stages = await Stage.find({ pipeline_id: pipelineId }).select({ _id: 1, order: 1 }).lean();
    if (!stages.length) {
      return NextResponse.json({ error: 'No stages found for pipeline' }, { status: 404 });
    }

    const contacts = await Contact.find({}).select({ _id: 1, pipelinesActive: 1 });

    const bulkOps = contacts.map((contact: any) => {
      const stage = stages[Math.floor(Math.random() * stages.length)];
      const pipelineOid = new mongoose.Types.ObjectId(pipelineId);
      const stageOid = new mongoose.Types.ObjectId(String(stage._id));
      const nextPipelines = Array.isArray(contact.pipelinesActive) ? [...contact.pipelinesActive] : [];
      const idx = nextPipelines.findIndex((p: any) => String(p.pipeline_id) === String(pipelineOid));

      if (idx >= 0) {
        nextPipelines[idx] = {
          ...nextPipelines[idx],
          pipeline_id: pipelineOid,
          stage_id: stageOid,
          order: typeof stage.order === 'number' ? stage.order : nextPipelines[idx].order ?? 0,
        };
      } else {
        nextPipelines.push({
          pipeline_id: pipelineOid,
          stage_id: stageOid,
          order: typeof stage.order === 'number' ? stage.order : 0,
        });
      }

      return {
        updateOne: {
          filter: { _id: contact._id },
          update: { $set: { pipelinesActive: nextPipelines } },
        },
      };
    });

    if (bulkOps.length > 0) {
      await Contact.collection.bulkWrite(bulkOps, { ordered: false });
    }

    return NextResponse.json({ success: true, updated: bulkOps.length, pipelineId });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to mix stages', message: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;

