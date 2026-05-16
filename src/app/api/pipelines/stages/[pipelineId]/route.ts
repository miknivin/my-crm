import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db/connection';
import Stage from '@/app/models/Stage';

export async function GET(req: NextRequest, context: { params: Promise<{ pipelineId: string }> }) {
  try {
    await dbConnect();
    
    const { pipelineId } = await context.params; // Await the Promise to get the params object

    if (!pipelineId) {
      return NextResponse.json({
        success: false,
        message: 'Pipeline ID is required',
      }, { status: 400 });
    }

    const stages = await Stage.find({ pipeline_id: pipelineId })
      .select('name order')
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: stages,
    }, { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch stages',
    }, { status: 500 });
  }
}