import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedUser } from "../../middlewares/auth";
import dbConnect from "@/app/lib/db/connection";
import AiReportSessionMessage from "@/app/models/AiReportSessionMessage";

type StoredAiResponse = {
  results?: Array<{
    step?: {
      ui?: {
        type?: string;
      };
    };
  }>;
};

export async function GET(request: NextRequest) {
  try {
    const user = await isAuthenticatedUser(request);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
    const sessionId = searchParams.get("sessionId")?.trim();

    const query = sessionId ? { user: user._id, sessionId } : { user: user._id };

    const history = await AiReportSessionMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const items = history.map((item) => ({
      id: String(item._id),
      queryText: item.queryTextDisplay || item.queryText,
      sessionId: item.sessionId,
      toolRequest: item.toolRequest,
      response: item.response,
      uiType: (item.response as StoredAiResponse | undefined)?.results?.[0]?.step?.ui?.type,
      updatedAt: item.updatedAt || item.createdAt,
    }));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
