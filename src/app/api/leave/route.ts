/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from "@/app/lib/db/connection";
import { authorizeRoles, isAuthenticatedUser } from '../middlewares/auth';
import LeaveRequest from '@/app/models/Leave';
import { validateLeaveRequest } from '../middlewares/validateLeaveCreate';

interface LeaveRequestBody {
  leaveType: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
  durationType?: 'full-day' | 'half-day' | 'quarter-day';
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const user = await isAuthenticatedUser(req);

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;
const search = url.searchParams.get('search') || '';
    let leaveRequests;
    let total;
    const searchRegex = new RegExp(search, 'i');
    if (user.role === 'admin') {

      authorizeRoles(user, 'admin');
      const query = search

        ? {

            $or: [

              { employeeName: searchRegex },

              { leaveType: searchRegex },

              { reason: searchRegex },

            ],

          }

        : {};
      total = await LeaveRequest.countDocuments(query);

      leaveRequests = await LeaveRequest.find(query)
        .populate('employeeId', 'name email')
        .populate('approverId', 'name email')
        .skip(skip)
        .sort({ createdAt: -1 })
        .limit(limit);
    } else {
      // Non-admins can only fetch their own leave requests
      authorizeRoles(user, 'user', 'employee', 'team_member');
      
const query = {

        employeeId: user._id,

        ...(search && {

          $or: [

            { employeeName: searchRegex },

            { leaveType: searchRegex },

            { reason: searchRegex },

          ],

        }),

      };
      total = await LeaveRequest.countDocuments(query);
      leaveRequests = await LeaveRequest.find(query)
        .populate('employeeId', 'name email')
        .populate('approverId', 'name email')
        .skip(skip)
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    return NextResponse.json({
      message: 'Leave requests fetched successfully',
      data: {
        leaves: leaveRequests,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: error.status || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Authenticate user
    const user = await isAuthenticatedUser(req);

    // Parse request body
    const body = await req.json() as LeaveRequestBody;

    // Destructure and ensure durationType fallback
    const { leaveType, startDate, endDate, reason } = body;
    const validatedDurationType = body.durationType || 'full-day';
    // Validate leave request
    await validateLeaveRequest({
      leaveType,
      startDate,
      endDate,
      reason,
      durationType: validatedDurationType,
    });

    // Log constructor input
    const leaveData = {
      employeeId: new Types.ObjectId(user._id),
      employeeName: user.name || 'Unknown',
      leaveType,
      durationType: validatedDurationType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'pending',
    };

    // Create new leave request
    const leaveRequest = new LeaveRequest(leaveData);

    // Save to database
    const savedLeave = await leaveRequest.save();



    return NextResponse.json({
      message: 'Leave request created successfully',
      data: {
        ...savedLeave.toObject(),
        id: savedLeave._id.toString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating leave request:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: error.status || 500 });
  }
}