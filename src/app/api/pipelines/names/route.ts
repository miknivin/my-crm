import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/app/lib/db/connection';
import Pipeline from '@/app/models/Pipeline';


export async function GET(req: NextRequest) {
  try {
    console.log('exe');
    
    await dbConnect();
    console.log(req.body,'no body');
    
    const pipelines = await Pipeline.find()
      .select('name _id')
      .lean();
      
    return NextResponse.json({
      success: true,
      data: pipelines,
    }, { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch pipelines',
    }, { status: 500 });
  }
}