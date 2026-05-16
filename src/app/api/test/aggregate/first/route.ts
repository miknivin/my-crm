// app/api/contacts/by-assigned-user/route.ts
import ContactAggregationBuilder from '@/app/classes/ContactAggregationBuilder';
import { NextResponse } from 'next/server';

const HARDCODED_USER_ID = '6858246187f5899a7e6fc733';

export async function GET() {
  try {
    const results = await ContactAggregationBuilder.create()
      .filterByAssignedUser(HARDCODED_USER_ID)
      .exec();

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error fetching contacts by assigned user:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}