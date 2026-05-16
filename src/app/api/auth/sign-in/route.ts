import { NextRequest, NextResponse } from 'next/server';
import User from '@/app/models/User'; 
import { z } from 'zod';
import dbConnect from './../../../lib/db/connection';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedData = signInSchema.safeParse(body);

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

    const { email, password } = parsedData.data;

    // Connect to MongoDB using dbConnect
    await dbConnect();

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Verify password using schema method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Generate JWT token using schema method
    const token = user.getJwtToken();

    // Create response with token
    const response = NextResponse.json(
      {
        success: true,
        message: 'Sign-in successful',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          uid: user.uid,
        },
      },
      { status: 200 }
    );

    // Set token in cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('Sign-in error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}