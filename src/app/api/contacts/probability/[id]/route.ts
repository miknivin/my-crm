/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import  { Types } from 'mongoose';
import Contact from '@/app/models/Contact';
import dbConnect from '@/app/lib/db/connection';
import { authorizeRoles, isAuthenticatedUser } from '@/app/api/middlewares/auth';
import Pipeline from '@/app/models/Pipeline';
import Stage from '@/app/models/Stage';

// Interface for request body
interface UpdateProbabilityRequest {
  probability: number;
}

// PATCH handler to update contact probability
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to database
    Pipeline
    Stage
    await dbConnect();

    // Authenticate user and authorize roles
    let user;
    try {
      user = await isAuthenticatedUser(request);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!user._id) {
      return NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 401 }
      );
    }

    authorizeRoles(user, 'admin', 'team_member');

    // Extract and await params
    const { id } = await context.params;

    // Validate ID
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing contact ID' },
        { status: 400 }
      );
    }

    const { probability } = await request.json() as UpdateProbabilityRequest;

    // Validate probability
    if (typeof probability !== 'number' || probability < 0 || probability > 100) {
      return NextResponse.json(
        { success: false, error: 'Probability must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    // Find and update contact
    const contact = await Contact.findById(id);
    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Store old probability for logging
    const oldProbability = contact.probability;

    // Update probability
    contact.probability = probability;

    // Log activity
    await contact.logActivity(
      'CONTACT_UPDATED',
      new Types.ObjectId(user._id),
      {
        field: 'probability',
        oldValue: oldProbability,
        newValue: probability,
      }
    );

    // Save contact
    await contact.save();

    return NextResponse.json({
      success: true,
      message: 'Probability updated successfully',
      contact: {
        _id: contact._id,
        probability: contact.probability,
      },
    });
  } catch (error: any) {
    console.error('Error updating contact probability:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: error.message.includes('login') || error.message.includes('Not allowed') ? 401 : 500 }
    );
  }
}