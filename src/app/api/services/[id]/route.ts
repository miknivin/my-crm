/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/app/lib/db/connection';
import Service from '@/app/models/Service';
import { authorizeRoles, isAuthenticatedUser } from '../../middlewares/auth';

interface UpdateServiceBody {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
  billingType?: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  taxPercent?: number;
  isActive?: boolean;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    await isAuthenticatedUser(req);

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid service ID' }, { status: 400 });
    }

    const service = await Service.findById(id);
    if (!service) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Service fetched successfully',
        data: {
          ...service.toObject(),
          id: service._id.toString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch service' },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, 'admin');

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid service ID' }, { status: 400 });
    }

    const service = await Service.findById(id);
    if (!service) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 });
    }

    const body = (await req.json()) as UpdateServiceBody;

    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (!trimmedName) {
        return NextResponse.json({ message: 'Service name is required' }, { status: 400 });
      }

      const existing = await Service.findOne({ name: trimmedName, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ message: 'A service with this name already exists' }, { status: 409 });
      }

      body.name = trimmedName;
    }

    if (body.price !== undefined && (Number.isNaN(Number(body.price)) || Number(body.price) < 0)) {
      return NextResponse.json({ message: 'Price must be a valid non-negative number' }, { status: 400 });
    }

    if (body.taxPercent !== undefined && (body.taxPercent < 0 || body.taxPercent > 100)) {
      return NextResponse.json({ message: 'Tax percent must be between 0 and 100' }, { status: 400 });
    }

    const updatedService = await Service.findByIdAndUpdate(
      id,
      {
        $set: {
          ...body,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Service updated successfully',
        data: {
          ...updatedService.toObject(),
          id: updatedService._id.toString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update service' },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, 'admin');

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid service ID' }, { status: 400 });
    }

    const deleted = await Service.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Service deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete service' },
      { status: error.status || 500 }
    );
  }
}
