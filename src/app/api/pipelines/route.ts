import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db/connection';
import { validatePipelineCreate } from '../middlewares/validatePipelineCreate';
import Pipeline from '@/app/models/Pipeline';
import Stage from '@/app/models/Stage';
import { PipelineQueryParams, validatePipelineQueryParams } from '../middlewares/validatePipelineQueryParams';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import User from "@/app/models/User"; // Import the User model
import { authorizeRoles, isAuthenticatedUser } from '../middlewares/auth';
//import mongoose from 'mongoose';


interface PipelineQueryFilter {
  name?: { $regex: string; $options: string };
  created_at?: { $gte?: Date; $lte?: Date };
}


interface LeanPipeline {
  _id: string;
  name: string;
  notes?: string | null;
  user: { name: string; email: string };
  created_at: Date;
  updated_at: Date;
  __v: number;
}


interface PipelineResponse {
  pipelines: LeanPipeline[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export async function POST(req:NextRequest) {
  try {
     const user = await isAuthenticatedUser(req);
    if (!user) {
        return NextResponse.json(
            { success: false, message: "Need to login" },
            { status: 400 }
        );
    }
    authorizeRoles(user, "admin");
    await dbConnect();

    const { name, notes, userId, stages } = await req.json();

    const validationResult = validatePipelineCreate({ name, notes, userId, stages });
    if (validationResult.error) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    const pipeline = await Pipeline.create({
      name: name.trim(),
      notes: notes?.trim() || undefined,
      user: userId,
    });

    // Create stages if provided
    if (stages && stages.length > 0) {
      const stageDocs = stages.map((stage: { name: string; order: number; probability: number }) => ({
        pipeline_id: pipeline._id,
        name: stage.name.trim(),
        order: stage.order,
        probability: stage.probability,
      }));
      await Stage.insertMany(stageDocs);
    }

    return NextResponse.json({ pipeline }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating pipeline:', error);
    if (error instanceof Error) {
      if ('code' in error && error.code === 11000) {
        return NextResponse.json({ error: 'Pipeline name already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await isAuthenticatedUser(request);
    if (!user) {
        return NextResponse.json(
            { success: false, message: "Need to login" },
            { status: 400 }
        );
    }
    try {
        authorizeRoles(user, "admin");
      } catch (error) {
        console.log(error);

        try {
          authorizeRoles(user, "team_member");
        } catch (error) {
          console.log(error);
           return NextResponse.json(
        { error: "User is neither admin or team member" },
        { status: 401 }
      );
        }
      }
    await dbConnect();
   // mongoose.model("User");
    const { searchParams } = new URL(request.url);
    const rawParams: PipelineQueryParams = {
      page: searchParams.get('page') || "1",
      limit: searchParams.get('limit') || "10",
      search: searchParams.get('search') || "",
      createdFrom: searchParams.get('createdFrom') || "",
      createdTo: searchParams.get('createdTo') || "",
    };

    const { page, limit, search, createdFrom, createdTo } = validatePipelineQueryParams(rawParams);

    const skip = (page - 1) * limit;

    const query: PipelineQueryFilter = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (createdFrom || createdTo) {
      query.created_at = {};
      if (createdFrom) {
        query.created_at.$gte = createdFrom;
      }
      if (createdTo) {
        query.created_at.$lte = createdTo;
      }
    }

    // Execute queries
    const [pipelines, total] = await Promise.all([
      Pipeline.find(query)
        .populate('user', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 })
        .lean() as unknown as Promise<LeanPipeline[]>, 
      Pipeline.countDocuments(query),
    ]);


    const response: PipelineResponse = {
      pipelines,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching pipelines:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


