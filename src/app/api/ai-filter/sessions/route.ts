import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedUser, authorizeRoles } from "../../middlewares/auth";
import dbConnect from "@/app/lib/db/connection";
import AiReportSession from "@/app/models/AiReportSession";

export async function GET(request: NextRequest) {
  try {
    const user = await isAuthenticatedUser(request);
    authorizeRoles(user, "admin", "team_member");
    await dbConnect();

    const sessions = await AiReportSession.find({ user: user._id })
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();

    const items = sessions.map((session) => ({
      sessionId: session.sessionId,
      title: session.title,
      lastMessageAt: session.lastMessageAt,
      messageCount: session.messageCount,
    }));

    return NextResponse.json({ success: true, sessions: items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sessions";
    const status = message === "Not allowed" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = "nodejs";
