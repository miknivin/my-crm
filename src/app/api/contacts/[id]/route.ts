/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import  { Types } from 'mongoose';
import Contact from '@/app/models/Contact';
import dbConnect from '@/app/lib/db/connection';
import { authorizeRoles, isAuthenticatedUser } from '@/app/api/middlewares/auth';
import User from '@/app/models/User';
import Pipeline from '@/app/models/Pipeline';
import Stage from '@/app/models/Stage';
import Task from '@/app/models/Task';
import ActivityLog from '@/app/models/ActivityLog';

// Interface for request body
interface UpdateContactRequest {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  tags?: { name: string }[];
  businessName?: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    User
    Task
    ActivityLog
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
    const { id } = await context.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing contact ID' },
        { status: 400 }
      );
    }
    const contact = await Contact.findById(id)
      .populate('assignedTo.user', 'name')
      .populate('tags.user', 'name')
      .populate('user', 'name')
      .populate('activities.user', 'name')
      .populate('remarks.createdBy', 'name email')
      .lean();
    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }
    const [tasks, activityLogs] = await Promise.all([
      Task.find({ contactId: id })
        .populate('assignedTo', 'name email')
        .populate('owner', 'name email')
        .populate('createdBy', 'name email')
        .sort({ dueDate: 1, createdAt: -1 })
        .lean(),
      ActivityLog.find({ contactId: id })
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    const normalizedActivityLogs = activityLogs.map((activityLog: any) => ({
      _id: activityLog._id,
      action: activityLog.event,
      user: activityLog.performedBy,
      details: {
        description: activityLog.description,
        ...(activityLog.metadata ?? {}),
      },
      createdAt: activityLog.createdAt,
    }));
    const contactWithTimeline = {
      ...contact,
      activities: [...(contact.activities ?? []), ...normalizedActivityLogs],
    };

    return NextResponse.json({
      success: true,
      data: contactWithTimeline,
      contact: contactWithTimeline,
      tasks,
      activityLogs,
    });
  } catch (error: any) {
    console.error('Error retrieving contact:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: error.message.includes('login') || error.message.includes('Not allowed') ? 401 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    User;
    Pipeline;
    Stage;
    let user;
    try {
      user = await isAuthenticatedUser(request);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Authentication failed' },
        { status: 401 }
      );
    }
    if (!user._id || !Types.ObjectId.isValid(user._id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 401 }
      );
    }

    // Check user role
    let isAdmin = false;
    try {
      authorizeRoles(user, 'admin');
      isAdmin = true;
    } catch (error) {
      console.log("Admin authorization failed:", error);
      try {
        authorizeRoles(user, 'team_member');
      } catch (error) {
        console.log("Team member authorization failed:", error);
        return NextResponse.json(
          { error: "User is neither admin nor team member" },
          { status: 401 }
        );
      }
    }

    const { id } = await context.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing contact ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body: UpdateContactRequest = await request.json();

    // Manual validation
    const errors: string[] = [];

    if (!body.name || typeof body.name !== 'string' || body.name.length > 200) {
      errors.push('Name is required and must not exceed 200 characters');
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push('Valid email is required');
    }
    if (!body.phone || !/^\+?[1-9]\d{1,14}$/.test(body.phone)) {
      errors.push('Valid phone number is required (e.g., +1234567890)');
    }
    if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 5000)) {
      errors.push('Notes must be a string and not exceed 5000 characters if provided');
    }
    if (body.businessName !== undefined && (typeof body.businessName !== 'string' || body.businessName.length > 200)) {
      errors.push('Business name must be a string and not exceed 200 characters if provided');
    }
    if (
      body.tags !== undefined &&
      (!Array.isArray(body.tags) ||
        body.tags.some((tag) => typeof tag !== 'object' || !tag.name || typeof tag.name !== 'string'))
    ) {
      errors.push('Tags must be an array of objects with a name property if provided');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input data',
          errors,
        },
        { status: 400 }
      );
    }

    // Find the contact based on role
    const contactQuery = isAdmin ? { _id: id } : { _id: id, user: user._id };
    const contact = await Contact.findOne(contactQuery);
    if (!contact) {
      return NextResponse.json(
        { success: false, message: 'Contact not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check for duplicate email (excluding current contact)
    const existingEmailContact = await Contact.findOne({
      email: body.email,
      _id: { $ne: id },
    });
    if (existingEmailContact) {
      return NextResponse.json(
        { success: false, message: 'Email already in use by another contact' },
        { status: 400 }
      );
    }

    // Check for duplicate phone (excluding current contact)
    const existingPhoneContact = await Contact.findOne({
      phone: body.phone,
      _id: { $ne: id },
    });
    if (existingPhoneContact) {
      return NextResponse.json(
        { success: false, message: 'Phone number already in use by another contact' },
        { status: 400 }
      );
    }

    // Log tag changes
    const oldTags = contact.tags.map((tag) => tag.name);
    const newTags = body.tags ? body.tags.map((tag) => tag.name) : [];
    const addedTags = newTags.filter((tag) => !oldTags.includes(tag));
    const removedTags = oldTags.filter((tag) => !newTags.includes(tag));

    // Update contact fields
    contact.name = body.name;
    contact.email = body.email;
    contact.phone = body.phone;
    contact.notes = body.notes ?? '';
    contact.businessName=body.businessName??''
    // Clear existing tags and add new ones
    contact.tags.splice(0, contact.tags.length);
    if (body.tags) {
      body.tags.forEach((tag) => {
        contact.tags.push({ name: tag.name, user: new Types.ObjectId(user._id) });
      });
    }

    await contact.save();

    // Log activities for tag changes
    for (const tag of addedTags) {
      await contact.logActivity('TAG_ADDED', new Types.ObjectId(user._id), { tag });
    }
    for (const tag of removedTags) {
      await contact.logActivity('TAG_REMOVED', new Types.ObjectId(user._id), { tag });
    }
    // Log contact update
    await contact.logActivity('CONTACT_UPDATED', new Types.ObjectId(user._id), {
      updatedFields: { name: body.name, email: body.email, phone: body.phone, notes: body.notes },
    });

    // Fetch updated contact with populated fields
    const updatedContact = await Contact.findById(id)
      .populate('assignedTo.user', 'name')
      .populate('tags.user', 'name')
      .populate('user', 'name')
      .populate('activities.user', 'name')
      .lean();

    return NextResponse.json(
      {
        success: true,
        contact: updatedContact,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: error.message.includes('login') || error.message.includes('Not allowed') ? 401 : 500 }
    );
  }
}

