import { NextRequest, NextResponse } from 'next/server';
import User from '@/app/models/User'; // Adjust path to your User model
import { z } from 'zod';
import dbConnect from './../../../lib/db/connection';
import sendToken from '../../utils/sendToken';

// Define validation schema using Zod
const registerSchema = z.object({
  name: z.string().max(50).optional(),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedData = registerSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input data',
          errors: parsedData.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, email, password, phone } = parsedData.data;

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: existingUser.email === email 
            ? 'User with this email already exists'
            : 'User with this phone number already exists',
        },
        { status: 400 }
      );
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      signupMethod: 'Email/Password',
    });

    // Save user to database
    await user.save();

    // Use sendToken to generate response with token and cookie
    return sendToken(user, 201);
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}