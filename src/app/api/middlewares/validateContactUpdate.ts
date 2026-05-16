import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Stage from '@/app/models/Stage';
import Pipeline from '@/app/models/Pipeline';
import Contact from '@/app/models/Contact';


interface UpdatePipelineRequest {
  contactIds: string[];
  pipelineId: string;
  stageId: string;
  userId: string;
}

interface ValidationResult {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contacts?: any[];
  response?: NextResponse;
}

export async function validateUpdatePipelineRequest(body: UpdatePipelineRequest): Promise<ValidationResult> {
  const { contactIds, pipelineId, stageId, userId } = body;

  // Validate request body
  if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: 'Contact IDs are required and must be an array' },
        { status: 400 }
      ),
    };
  }

  if (!pipelineId || !mongoose.Types.ObjectId.isValid(pipelineId)) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: 'Invalid pipeline ID' },
        { status: 400 }
      ),
    };
  }

  if (!stageId || !mongoose.Types.ObjectId.isValid(stageId)) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: 'Invalid stage ID' },
        { status: 400 }
      ),
    };
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: 'Invalid user ID' },
        { status: 400 }
      ),
    };
  }

  // Validate pipeline and stage existence
  const pipeline = await Pipeline.findById(pipelineId);
  if (!pipeline) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: 'Pipeline not found' },
        { status: 404 }
      ),
    };
  }

  const stage = await Stage.findOne({ _id: stageId, pipeline_id: pipelineId });
  if (!stage) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: 'Stage not found or does not belong to the specified pipeline' },
        { status: 404 }
      ),
    };
  }

  // Fetch contacts
  const contacts = await Contact.find({ _id: { $in: contactIds } });
  if (contacts.length === 0) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: 'No contacts found' },
        { status: 404 }
      ),
    };
  }

  return { success: true, contacts };
}