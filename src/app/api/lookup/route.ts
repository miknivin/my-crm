import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/app/lib/db/connection'; // Import dbConnect
import User from '@/app/models/User';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

export async function GET(request: Request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get('objectId');
    const key = searchParams.get('key');

    // Validate inputs
    if (!objectId || !key) {
      return NextResponse.json(
        { error: 'Missing objectId or key' },
        { status: 400 }
      );
    }

    if (!isValidObjectId(objectId)) {
      return NextResponse.json(
        { error: 'Invalid ObjectId' },
        { status: 400 }
      );
    }

    // Connect to MongoDB using dbConnect
    await dbConnect();

    // Check if key contains "user ids" (case-insensitive)
    if (key.toLowerCase().includes('user ids')) {
      const user = await User.findById(objectId).select('name').lean() as { name?: string } | null;
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        objectId,
        key,
        name: user.name || 'Unknown',
      });
    }

    // If key doesn't match "user ids", return a generic response
    return NextResponse.json({
      message: 'Key does not require user lookup',
      objectId,
      key,
    });

  } catch (error) {
    console.error('Error in /api/user-lookup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}