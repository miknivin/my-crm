/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";

import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import { logContactActivity } from "@/app/api/utils/activityLog";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";

import { BatchUpdateItem, validateBatchUpdates } from "./validation";

interface BatchUpdateRequest {
  updates: BatchUpdateItem[];
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await isAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Need to login" }, { status: 400 });
    }
    const userId = user._id?.toString();
    if (!userId) {
      return NextResponse.json({ success: false, message: "Invalid user data" }, { status: 401 });
    }

    try {
      authorizeRoles(user, "admin");
    } catch {
      try {
        authorizeRoles(user, "team_member");
      } catch {
        return NextResponse.json({ error: "User is neither admin nor team_member" }, { status: 401 });
      }
    }

    await dbConnect();

    let body: BatchUpdateRequest;
    try {
      body = (await req.json()) as BatchUpdateRequest;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const dedupedMap = new Map<string, BatchUpdateItem>();
    for (const update of body.updates ?? []) {
      dedupedMap.set(`${update.contactId}-${update.pipelineId}`, update);
    }
    const updates = Array.from(dedupedMap.values());

    const { contactMap } = await validateBatchUpdates(updates);

    const bulkOps: any[] = [];

    for (const update of updates) {
      const { contactId, pipelineId, stageId, order } = update;
      const contact = contactMap.get(contactId);
      const pipelineObjectId = new Types.ObjectId(pipelineId);
      const stageObjectId = new Types.ObjectId(stageId);

      const pipelineExists = (contact?.pipelinesActive ?? []).some(
        (pa: any) => pa.pipeline_id?.toString() === pipelineId
      );

      if (pipelineExists) {
        bulkOps.push({
          updateOne: {
            filter: { _id: new Types.ObjectId(contactId) },
            update: {
              $set: {
                "pipelinesActive.$[elem].stage_id": stageObjectId,
                "pipelinesActive.$[elem].order": order,
              },
              $currentDate: { updatedAt: true },
            },
            arrayFilters: [{ "elem.pipeline_id": pipelineObjectId }],
          },
        });
      } else {
        bulkOps.push({
          updateOne: {
            filter: { _id: new Types.ObjectId(contactId) },
            update: {
              $push: {
                pipelinesActive: {
                  pipeline_id: pipelineObjectId,
                  stage_id: stageObjectId,
                  order,
                },
              },
              $currentDate: { updatedAt: true },
            },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await Contact.bulkWrite(bulkOps, { ordered: false, session });
          await Promise.all(
            updates.map((update) => {
              const contact = contactMap.get(update.contactId);
              const oldStage = (contact?.pipelinesActive ?? []).find(
                (pa: any) => pa.pipeline_id?.toString() === update.pipelineId
              )?.stage_id?.toString();

              if (oldStage === update.stageId) {
                return Promise.resolve();
              }

              return logContactActivity({
                contactId: update.contactId,
                event: "PIPELINE_STAGE_CHANGED",
                description: "Pipeline stage changed",
                performedBy: userId,
                metadata: {
                  pipelineId: update.pipelineId,
                  oldStage,
                  newStage: update.stageId,
                  order: update.order,
                },
                session,
              });
            })
          );
        });
      } finally {
        await session.endSession();
      }
    }

    return NextResponse.json({
      success: true,
      updated: bulkOps.length,
    });
  } catch (error: any) {
    console.error("Error updating contacts pipeline:", error);

    if (error.name === "MongoServerError" && error.code === 11000) {
      return NextResponse.json(
        { error: `Duplicate key error for contact _id: ${error.keyValue?._id || "unknown"}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      {
        status:
          error.message?.includes("not found") || error.message?.includes("Invalid")
            ? 400
            : 500,
      }
    );
  }
}
