/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db/connection';
import Service from '@/app/models/Service';
import { authorizeRoles, isAuthenticatedUser } from '../middlewares/auth';

interface CreateServiceBody {
  name: string;
  description?: string;
  category?: string;
  price: number;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
  billingType?: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  taxPercent?: number;
  isActive?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    await isAuthenticatedUser(req);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(search, 'i');

    const query = search
      ? {
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { category: searchRegex },
            { billingType: searchRegex },
          ],
        }
      : {};

    const total = await Service.countDocuments(query);
    const services = await Service.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

    return NextResponse.json(
      {
        message: 'Services fetched successfully',
        data: {
          services,
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch services' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, 'admin');

    const body = (await req.json()) as CreateServiceBody;
    const name = body.name?.trim();
    const price = Number(body.price);

    if (!name) {
      return NextResponse.json({ message: 'Service name is required' }, { status: 400 });
    }

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json({ message: 'Price must be a valid non-negative number' }, { status: 400 });
    }

    const existing = await Service.findOne({ name });
    if (existing) {
      return NextResponse.json({ message: 'A service with this name already exists' }, { status: 409 });
    }

    const service = await Service.create({
      name,
      description: body.description || '',
      category: body.category || '',
      price,
      currency: body.currency || 'INR',
      billingType: body.billingType || 'one-time',
      taxPercent: body.taxPercent ?? 0,
      isActive: body.isActive ?? true,
    });

    return NextResponse.json(
      {
        message: 'Service created successfully',
        data: {
          ...service.toObject(),
          id: service._id.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create service' },
      { status: error.status || 500 }
    );
  }
}

