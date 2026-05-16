import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/app/lib/db/connection';
import Pipeline from '@/app/models/Pipeline';
import Stage from '@/app/models/Stage';
// import Contact from '@/app/models/Contact';
import User from "@/app/models/User";
// Interface for lean stage
interface LeanStage {
  _id: string;
  pipeline_id: string;
  name: string;
  order: number;
  probability: number;
  created_at: Date;
  updated_at: Date;
}

// Interface for lean contact
interface LeanContact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  assignedTo: Array<{ user: { name: string; email: string }; time: Date }>;
  pipelinesActive: Array<{ pipeline_id: string; stage_id: string }>;
  tags: Array<{ user: { name: string; email: string }; name: string }>;
  user?: { name: string; email: string };
  uid?: number;
  activities: Array<{
    action: string;
    user: { name: string; email: string };
    details: Record<string, unknown>;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for lean pipeline
interface LeanPipeline {
  _id: string;
  name: string;
  notes?: string | null;
  user: { name: string; email: string };
  created_at: Date;
  updated_at: Date;
  __v: number;
}

// Interface for pipeline with stages and contacts
interface PipelineWithDetails extends LeanPipeline {
  stages: LeanStage[];
  contacts?: LeanContact[];
}

// Interface for API response
interface PipelineByIdResponse {
  pipeline: PipelineWithDetails | null;
}

 
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();

    const { id } = await context.params;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    User
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid pipeline ID' }, { status: 400 });
    }

    // Fetch pipeline
    const pipeline = await Pipeline.findById(id)
      .populate('user', 'name email')
      .lean() as LeanPipeline | null;

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    // Fetch stages
    const stages = await Stage.find({ pipeline_id: id })
        .lean() as unknown as LeanStage[];

    // Fetch contacts
    // const contacts = await Contact.find({ 'pipelinesActive.pipeline_id': id })
    //     .populate([
    //         { path: 'user', select: 'name email' },
    //         { path: 'assignedTo.user', select: 'name email' },
    //         { path: 'tags.user', select: 'name email' },
    //         { path: 'activities.user', select: 'name email' },
    //     ])
    //     .lean() as unknown as LeanContact[];

    // Combine response
    const response: PipelineByIdResponse = {
      pipeline: {
        ...pipeline,
        stages,
        // contacts,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching pipeline by ID:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}