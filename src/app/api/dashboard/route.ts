/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { authorizeRoles, isAuthenticatedUser } from '../middlewares/auth';
import Contact from '@/app/models/Contact';
import dbConnect from '@/app/lib/db/connection';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';

interface MonthlyConversionRate {
  year: number;
  month: string;
  totalContacts: number;
  closedContacts: number;
  conversionRate: string;
}

interface DashboardResponse {
  success: boolean;
  totalContacts: number;
  totalClosedContacts: number;
  monthlyConversionRates: MonthlyConversionRate[];
  currentMonthClosedContacts: number;
  lastMonthClosedContacts: number;
}

export async function GET(req: NextRequest) {
  try {
    const user = await isAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Need to login' }, { status: 401 });
    }

    try {
      authorizeRoles(user, 'admin', 'team_member');
    } catch {
      return NextResponse.json(
        { error: 'Only admins or team members can view dashboard data' },
        { status: 403 }
      );
    }

    await dbConnect();

    const defaultStages = [
      '6858217887f5899a7e6fc6fc',
      '6858217887f5899a7e6fc6fb',
      '6858217887f5899a7e6fc6fd',
    ];

    const closedStageIds: string[] = process.env.SUCCESS_STAGES
      ? JSON.parse(process.env.SUCCESS_STAGES)
      : defaultStages;

    const isAdmin = user.role === 'admin';
    const contactBaseQuery = isAdmin ? {} : { 'assignedTo.user': user._id };

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthDate = subMonths(now, 1);
    const lastMonthStart = startOfMonth(previousMonthDate);
    const lastMonthEnd = endOfMonth(previousMonthDate);

    const countClosedContactsForRange = (rangeStart: Date, rangeEnd: Date) =>
      Contact.countDocuments({
        ...contactBaseQuery,
        'pipelinesActive.stage_id': { $in: closedStageIds },
        updatedAt: {
          $gte: rangeStart,
          $lte: rangeEnd,
        },
      });

    const [
      totalContacts,
      totalClosedContacts,
      monthlyData,
      currentMonthClosedContacts,
      lastMonthClosedContacts,
    ] = await Promise.all([
      Contact.countDocuments(contactBaseQuery),
      Contact.countDocuments({
        ...contactBaseQuery,
        'pipelinesActive.stage_id': { $in: closedStageIds },
      }),
      Contact.aggregate([
        { $match: contactBaseQuery },
        {
          $facet: {
            totalContacts: [
              {
                $group: {
                  _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                  count: { $sum: 1 },
                },
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } },
            ],
            closedContacts: [
              {
                $match: { 'pipelinesActive.stage_id': { $in: closedStageIds } },
              },
              {
                $group: {
                  _id: { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } },
                  count: { $sum: 1 },
                },
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } },
            ],
          },
        },
      ]),
      countClosedContactsForRange(currentMonthStart, currentMonthEnd),
      countClosedContactsForRange(lastMonthStart, lastMonthEnd),
    ]);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const monthlyConversionRates: MonthlyConversionRate[] = [];
    const totalByMonth = monthlyData[0]?.totalContacts ?? [];
    const closedByMonth = monthlyData[0]?.closedContacts ?? [];

    totalByMonth.forEach((t: any) => {
      const closed = closedByMonth.find(
        (c: any) => c._id.year === t._id.year && c._id.month === t._id.month
      );
      const closedCount = closed?.count ?? 0;
      const rate = t.count > 0 ? (closedCount / t.count).toFixed(2) : '0.00';

      monthlyConversionRates.push({
        year: t._id.year,
        month: monthNames[t._id.month - 1],
        totalContacts: t.count,
        closedContacts: closedCount,
        conversionRate: rate,
      });
    });

    closedByMonth.forEach((c: any) => {
      if (!totalByMonth.some((t: any) => t._id.year === c._id.year && t._id.month === c._id.month)) {
        monthlyConversionRates.push({
          year: c._id.year,
          month: monthNames[c._id.month - 1],
          totalContacts: 0,
          closedContacts: c.count,
          conversionRate: '0.00',
        });
      }
    });

    monthlyConversionRates.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
    });

    const response: DashboardResponse = {
      success: true,
      totalContacts,
      totalClosedContacts,
      monthlyConversionRates,
      currentMonthClosedContacts,
      lastMonthClosedContacts,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
