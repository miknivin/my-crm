/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";
import User from "@/app/models/User";
import { authorizeRoles, isAuthenticatedUser } from "../../middlewares/auth";

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFrom = <T>(list: T[]) => list[randomInt(0, list.length - 1)];

const randomDateWithinDays = (days: number) => {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - days);
  const ts = randomInt(past.getTime(), now.getTime());
  return new Date(ts);
};

const sampleFirst = ["Aarav", "Meera", "Dev", "Anaya", "Vikram", "Priya", "Kiran", "Neha", "Rohan", "Sana"];
const sampleLast = ["Patel", "Sharma", "Iyer", "Das", "Singh", "Kumar", "Gupta", "Nair", "Joshi", "Rao"];
const sampleSource = ["website", "referral", "campaign", "manual", "walk-in", "social"];

// ← Add this array
const possibleAssignedUsers: string[] = [
  "68df79eb7a426ef6a99d3edb",
  "6858246187f5899a7e6fc733",
  "6858240f87f5899a7e6fc725",
  "685823c687f5899a7e6fc719",
  "6858233287f5899a7e6fc70f",
  "685822a487f5899a7e6fc707",
] as const;

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    User;
    const user = await isAuthenticatedUser(request);
    authorizeRoles(user, "admin");

    const secret = request.headers.get("x-seed-secret");
    if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
      return NextResponse.json({ error: "Unauthorized seed" }, { status: 403 });
    }

    const body = (await request.json()) as { count?: number };
    const count = Math.min(Number(body.count || 500), 1000); // cap at 1000 for safety

    await dbConnect();

    const fixedOwnerId = new mongoose.Types.ObjectId("6858209087f5899a7e6fc6d7");

    const payload = Array.from({ length: count }).map((_, idx) => {
      const first = randomFrom(sampleFirst);
      const last = randomFrom(sampleLast);
      const name = `${first} ${last}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}.${Date.now()}${idx}@example.com`;
      const phone = `9${randomInt(100000000, 999999999)}`;

      const createdAt = randomDateWithinDays(180);
      const updatedAt = new Date(createdAt.getTime() + randomInt(0, 30 * 24 * 60 * 60 * 1000)); // up to 30 days after creation

      // Randomly pick one assigned user
      const assignedUserId = new mongoose.Types.ObjectId(randomFrom(possibleAssignedUsers));

      return {
        name,
        email,
        phone,
        user: fixedOwnerId,                    // ← the "owner" / createdBy
        source: randomFrom(sampleSource),
        value: randomInt(1000, 120000),
        probability: randomInt(5, 98),

        // ← This is the key change: assignedTo array with one recent assignment
        assignedTo: [
          {
            user: assignedUserId,
            time: randomDateWithinDays(60),    // assignment happened sometime in last ~2 months
          },
        ],

        // Optional: give ~30-40% chance of having a second (older) assignment
        ...(Math.random() < 0.35 && {
          assignedTo: [
            {
              user: new mongoose.Types.ObjectId(randomFrom(possibleAssignedUsers)),
              time: randomDateWithinDays(120),
            },
            {
              user: assignedUserId,
              time: randomDateWithinDays(60),
            },
          ],
        }),

        createdAt,
        updatedAt,
      };
    });

    const result = await Contact.insertMany(payload, { ordered: false });

    return NextResponse.json({
      success: true,
      inserted: result.length,
      sampleAssignedDistribution: possibleAssignedUsers.map(id => ({
        user: id.slice(-6),
        count: payload.filter(c => c.assignedTo.some(a => a.user.toString() === id)).length
      })),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Seed failed", stack: error.stack?.slice(0, 400) },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";