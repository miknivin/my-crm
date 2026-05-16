/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { authorizeRoles, isAuthenticatedUser } from "../../middlewares/auth";
import User, { IUser } from "@/app/models/User";
import dbConnect from "@/app/lib/db/connection";
import { validateUserInput } from "../../middlewares/validateTeamMember";
import Contact from "@/app/models/Contact";

type ResponseUser = Pick<IUser, '_id' | 'name' | 'email' | 'role' | 'signupMethod' | 'avatar' | 'uid' | 'phone'>;

interface CreateUserRequest {
  name?: string;
  email: string;
  phone: string; // Made phone required
  password?: string;
  signupMethod?: 'OTP' | 'Email/Password' | 'OAuth';
  avatar?: {
    public_id: string;
    url: string;
  };
}

interface TeamMembersResponse {
  success: boolean;
  users: Pick<IUser, '_id' | 'name' | 'email' | 'role' | 'signupMethod' | 'avatar' | 'uid' | 'createdAt' | 'phone'>[];
  page: number;
  totalPages: number;
  total: number;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const reqUser = await isAuthenticatedUser(req);
    if (!reqUser) {
      return NextResponse.json(
        { success: false, message: 'Need to login' },
        { status: 400 }
      );
    }

    // Authorize admin role
    try {
      authorizeRoles(reqUser, 'admin');
    } catch (error: any) {
      console.log('error', error);
      return NextResponse.json(
        { error: 'Only admins can create team members' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Parse request body
    let body: CreateUserRequest;
    try {
      body = await req.json();
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate input
    validateUserInput(body);

    const { name, email, phone, password, signupMethod = 'Email/Password', avatar } = body;

    // Validate Indian phone number
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid Indian phone number. Must be 10 digits starting with 6, 7, 8, or 9' },
        { status: 400 }
      );
    }

    // Create new user
    const newUser: Partial<IUser> = {
      name,
      email,
      phone, // Added phone field
      password: signupMethod === 'Email/Password' ? password : undefined,
      signupMethod,
      role: 'team_member',
      avatar,
    };

    const user = new User(newUser);
    await user.save();

    const responseUser: ResponseUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone, // Added phone to response
      role: user.role,
      signupMethod: user.signupMethod,
      avatar: user.avatar,
      uid: user.uid,
    };

    return NextResponse.json(
      {
        success: true,
        user: responseUser,
      },
      { status: 201 }
    );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating team member:', error);

    // Handle duplicate email or phone
    if (error.name === 'MongoServerError' && error.code === 11000) {
      const field = error.keyValue?.email ? 'email' : 'phone';
      const value = error.keyValue?.email || error.keyValue?.phone || 'unknown';
      return NextResponse.json(
        { error: `${field.charAt(0).toUpperCase() + field.slice(1)} ${value} already exists` },
        { status: 409 }
      );
    }

    // Handle validation errors (from schema or validateUserInput)
    if (error.name === 'ValidationError' || error.message.includes('is required') || error.message.includes('Invalid signup method') || error.message.includes('Avatar must include')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await isAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Need to login' },
        { status: 400 }
      );
    }

    try {
      authorizeRoles(user, 'admin');
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { error: 'Only admins can view team members' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: 'Page and limit must be positive numbers' },
        { status: 400 }
      );
    }

    const query: any = { role: 'team_member' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }, // Added phone to search query
      ];
    }

    const skip = (page - 1) * limit;
    const usersRaw = await User.find(query)
      .select('_id name email phone role signupMethod avatar uid createdAt') // Added phone to select
      .skip(skip)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const closedStageIds = [
      '682da76db5aab2e983c8863d',
      '682da76db5aab2e983c8863e',
      '682da76db5aab2e983c8863f',
    ];

    const users = await Promise.all(
      usersRaw.map(async (user: any) => {
        const totalAssignedContacts = await Contact.countDocuments({
          'assignedTo.user': user._id,
        });

        // Count closed contacts for the user
        const closedContacts = await Contact.countDocuments({
          'assignedTo.user': user._id,
          'pipelinesActive.stage_id': { $in: closedStageIds },
        });

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone, // Added phone to response
          role: user.role,
          signupMethod: user.signupMethod,
          avatar: user.avatar,
          uid: user.uid,
          createdAt: user.createdAt,
          assignedContacts: totalAssignedContacts,
          closedContacts: closedContacts,
        };
      })
    );

    // Count total documents
    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Prepare response
    const response: TeamMembersResponse = {
      success: true,
      users,
      page,
      totalPages,
      total,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}