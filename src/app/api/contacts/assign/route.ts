/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import User from "@/app/models/User";
import Contact from "@/app/models/Contact";
import Pipeline from "@/app/models/Pipeline";
import Stage from "@/app/models/Stage";
import { authorizeRoles, isAuthenticatedUser } from "../../middlewares/auth";
import dbConnect from "@/app/lib/db/connection";

// Define the request body interface
interface AssignContactsRequest {
  contactIds: string[];
  userIds: string[];
  assignType: "every" | "equally" | "roundRobin";
  isAddAsNewLead?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate the user
    const currentUser = await isAuthenticatedUser(req);
    authorizeRoles(currentUser, "admin");

    // Parse request body
    const body: AssignContactsRequest = await req.json();
    const { contactIds, userIds, assignType, isAddAsNewLead = false } = body;

    // Validate input
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "Invalid or empty contactIds" }, { status: 400 });
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Invalid or empty userIds" }, { status: 400 });
    }
    if (!["every", "equally", "roundRobin"].includes(assignType)) {
      return NextResponse.json({ error: "Invalid assignType" }, { status: 400 });
    }

    // Connect to database
    await dbConnect();

    // Verify users exist
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return NextResponse.json({ error: "One or more users not found" }, { status: 404 });
    }

    // Verify contacts exist
    const contacts = await Contact.find({ _id: { $in: contactIds } });
    if (contacts.length !== contactIds.length) {
      return NextResponse.json({ error: "One or more contacts not found" }, { status: 404 });
    }

    // Verify pipeline and stage if isAddAsNewLead is true
    let defaultPipeline = null;
    let defaultStage = null;
    if (isAddAsNewLead) {
      if (!process.env.DEFAULT_PIPELINE || !mongoose.Types.ObjectId.isValid(process.env.DEFAULT_PIPELINE)) {
        return NextResponse.json({ error: "Invalid default pipeline ID" }, { status: 400 });
      }
      if (!process.env.DEFAULT_STAGE || !mongoose.Types.ObjectId.isValid(process.env.DEFAULT_STAGE)) {
        return NextResponse.json({ error: "Invalid default stage ID" }, { status: 400 });
      }

      // Check if pipeline exists
      defaultPipeline = await Pipeline.findById(process.env.DEFAULT_PIPELINE);
      if (!defaultPipeline) {
        return NextResponse.json({ error: "Default pipeline not found" }, { status: 404 });
      }

      // Check if stage exists and belongs to the pipeline
      defaultStage = await Stage.findOne({
        _id: process.env.DEFAULT_STAGE,
        pipeline_id: process.env.DEFAULT_PIPELINE,
      });
      if (!defaultStage) {
        return NextResponse.json({ error: "Default stage not found or does not belong to the specified pipeline" }, { status: 404 });
      }
    }

    // Start a MongoDB session for atomic updates
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Assignment logic
        const updates: {
          contactId: string;
          assignedTo: { user: string; time: Date }[];
          activity: { action: string; user: string; details: object; createdAt: Date };
          pipelinesActive?: { pipeline_id: string; stage_id: string; order: number }[];
        }[] = [];

        if (assignType === "every") {
          // Assign all contacts to every user
          const assignedTo = userIds.map((userId) => ({ user: userId, time: new Date() }));
          contactIds.forEach((contactId) => {
            const update: any = {
              contactId,
              assignedTo,
              activity: {
                action: "ASSIGNED_TO_UPDATED",
                user: currentUser._id!,
                details: { userIds, assignType },
                createdAt: new Date(),
              },
            };
            if (isAddAsNewLead) {
              update.pipelinesActive = [{
                pipeline_id: process.env.DEFAULT_PIPELINE!,
                stage_id: process.env.DEFAULT_STAGE!,
                order: 0,
              }];
            }
            updates.push(update);
          });
        } else if (assignType === "equally") {
          const contactsPerUser = Math.floor(contactIds.length / userIds.length);
          let contactIndex = 0;

          // First, assign the base number of contacts to each user
          userIds.forEach((userId) => {
            for (let i = 0; i < contactsPerUser && contactIndex < contactIds.length; i++) {
              const update: any = {
                contactId: contactIds[contactIndex],
                assignedTo: [{ user: userId, time: new Date() }],
                activity: {
                  action: "ASSIGNED_TO_UPDATED",
                  user: currentUser._id!,
                  details: { userIds: [userId], assignType },
                  createdAt: new Date(),
                },
              };
              if (isAddAsNewLead) {
                update.pipelinesActive = [{
                  pipeline_id: process.env.DEFAULT_PIPELINE!,
                  stage_id: process.env.DEFAULT_STAGE!,
                  order: 0,
                }];
              }
              updates.push(update);
              contactIndex++;
            }
          });

          for (let i = contactIndex; i < contactIds.length; i++) {
            const userId = userIds[i % userIds.length];
            const update: any = {
              contactId: contactIds[i],
              assignedTo: [{ user: userId, time: new Date() }],
              activity: {
                action: "ASSIGNED_TO_UPDATED",
                user: currentUser._id!,
                details: { userIds: [userId], assignType },
                createdAt: new Date(),
              },
            };
            if (isAddAsNewLead) {
              update.pipelinesActive = [{
                pipeline_id: process.env.DEFAULT_PIPELINE!,
                stage_id: process.env.DEFAULT_STAGE!,
                order: 0,
              }];
            }
            updates.push(update);
          }
        } else if (assignType === "roundRobin") {
          contactIds.forEach((contactId, index) => {
            const userId = userIds[index % userIds.length];
            const update: any = {
              contactId,
              assignedTo: [{ user: userId, time: new Date() }],
              activity: {
                action: "ASSIGNED_TO_UPDATED",
                user: currentUser._id!,
                details: { userIds: [userId], assignType },
                createdAt: new Date(),
              },
            };
            if (isAddAsNewLead) {
              update.pipelinesActive = [{
                pipeline_id: process.env.DEFAULT_PIPELINE!,
                stage_id: process.env.DEFAULT_STAGE!,
                order: 0,
              }];
            }
            updates.push(update);
          });
        }

        // Perform bulk updates
       const bulkOps = updates.map(({ contactId, assignedTo, activity, pipelinesActive }) => {
        const updateOp: any = {
          updateOne: {
            filter: { _id: new Types.ObjectId(contactId) },
            update: {
              $set: { assignedTo },
              $push: {
              activities: {
                $each: [activity as any]
              }},
              $inc: { __v: 1 },
            },
          },
        };

        if (isAddAsNewLead && pipelinesActive) {
          updateOp.updateOne.update.$set.pipelinesActive = pipelinesActive;
        }

        return updateOp;
      });

        await Contact.bulkWrite(bulkOps, { session });

        // Log activity for pipeline addition if isAddAsNewLead is true
        if (isAddAsNewLead) {
        const pipelineActivityOps = contactIds.map((contactId) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(contactId) },
          update: {
            $push: {
              activities: {
                $each: [
                  {
                    action: "PIPELINE_ADDED",
                    user: currentUser._id!,
                    details: {
                      pipeline_id: process.env.DEFAULT_PIPELINE!,
                      stage_id: process.env.DEFAULT_STAGE!,
                    },
                    createdAt: new Date(),
                  } as any
                ]
              }
            }
          }
        }
        }));


          await Contact.bulkWrite(pipelineActivityOps, { session });
        }
      });
    } finally {
      session.endSession();
    }

    return NextResponse.json({ message: "Contacts assigned successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to assign contacts" },
      { status: error.message.includes("login") ? 401 : 500 }
    );
  }
}