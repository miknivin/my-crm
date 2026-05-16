/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from "@/app/lib/db/connection";
import { NextRequest, NextResponse } from "next/server";
import { ExtendedNextRequest, validateContactRequest } from "../middlewares/validateContactCreate";
import Contact from "@/app/models/Contact";
import Pipeline from "@/app/models/Pipeline";
import Stage from "@/app/models/Stage";
import mongoose from "mongoose";
import { isAuthenticatedUser } from "../middlewares/auth";
import { logContactActivity } from "../utils/activityLog";

export async function POST(req: NextRequest) {
  const validationResponse = await validateContactRequest(req as ExtendedNextRequest);
  if (validationResponse) {
    return validationResponse;
  }

  try {
     await dbConnect();
    
    
    const user = await isAuthenticatedUser(req);
 
    const { name, email, phone, notes, userId, tags = [], stage, businessName } = (req as ExtendedNextRequest).validatedBody!;

    const tagSubdocuments = tags
      ? tags.map((tagName: string) => ({
          user: new mongoose.Types.ObjectId(userId),
          name: tagName,
        }))
      : [];

    // Prepare assignedTo based on user role
    const assignedTo = user.role === "team_member"
      ? [
          {
            user: new mongoose.Types.ObjectId(user._id),
            time: new Date(),
          },
        ]
      : [];

    // Prepare contact data
    const contactData = {
      name,
      email,
      phone,
      notes,
      user: new mongoose.Types.ObjectId(userId),
      businessName,
      tags: tagSubdocuments,
      assignedTo, // Include assignedTo in contactData
    };

    // Define pipeline and stage IDs
    const pipelineId = new mongoose.Types.ObjectId(process.env.DEFAULT_PIPELINE || "682da76cb5aab2e983c88634");
    let stageId = new mongoose.Types.ObjectId(process.env.DEFAULT_STAGE || "682da76db5aab2e983c88636");

    // If stage is provided in the request body, use it
    if (stage) {
      try {
        stageId = new mongoose.Types.ObjectId(stage);
      } catch (error) {
        console.log(error);
        
        return NextResponse.json(
          { error: "Invalid stage ID format" },
          { status: 400 }
        );
      }
    }

    // Validate pipeline existence
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }

    // Validate stage existence and ensure it belongs to the pipeline
    const stageDoc = await Stage.findOne({ _id: stageId, pipeline_id: pipelineId });
    if (!stageDoc) {
      return NextResponse.json(
        { error: "Stage not found or does not belong to the specified pipeline" },
        { status: 404 }
      );
    }

    const session = await mongoose.startSession();
    let contact;
    try {
      await session.withTransaction(async () => {
        const existingContact = await Contact.exists({ email }).session(session);
        contact = await Contact.upsertContact(
          {
            ...contactData,
            tags: new mongoose.Types.DocumentArray(tagSubdocuments),
            assignedTo: new mongoose.Types.DocumentArray(assignedTo),
          },
          new mongoose.Types.ObjectId(userId),
          session
        );

        if (!existingContact) {
          await logContactActivity({
            contactId: contact._id,
            event: "CONTACT_CREATED",
            description: `Contact created: ${contact.name}`,
            performedBy: userId,
            metadata: { name, email, phone },
            session,
          });
        }

        // Add contact to the pipeline's pipelinesActive array
        const pipelineActiveEntry = {
          pipeline_id: pipelineId,
          stage_id: stageId,
          order: 0, // Default order; adjust as needed
        };

        contact.pipelinesActive.push(pipelineActiveEntry);
        await contact.save({ session });

        // Log the PIPELINE_ADDED activity
        await contact.logActivity("PIPELINE_ADDED", new mongoose.Types.ObjectId(userId), {
          pipelineId: pipelineId.toString(),
          stageId: stageId.toString(),
        }, session);

        // Log ASSIGNED_TO_UPDATED activity if assignedTo was updated
        if (user.role === "team_member") {
          await contact.logActivity("ASSIGNED_TO_UPDATED", new mongoose.Types.ObjectId(userId), {
            assignedUserId: user._id,
          }, session);
        }

        // Log TAG_ADDED activities for each tag
        if (tags && tags.length > 0) {
          for (const tagName of tags) {
            await contact.logActivity("TAG_ADDED", new mongoose.Types.ObjectId(userId), {
              tagName,
            }, session);
          }
        }
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json(
      {
        message: "Contact created/updated successfully and added to pipeline",
        contact,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating contact or adding to pipeline:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
