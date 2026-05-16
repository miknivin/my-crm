/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";
import Pipeline from "@/app/models/Pipeline";
import Stage from "@/app/models/Stage";
import User from "@/app/models/User";

import { isAuthenticatedUser } from "../../middlewares/auth";
import { buildByStageAggregation } from "./aggregation";
import { buildByStageMatchQuery } from "./filters";
import { ByStageApiError } from "./types";
import { parseAndValidateByStageParams } from "./validation";

export async function GET(req: NextRequest) {
  try {
    Pipeline;
    User;
    Stage;

    await dbConnect();

    const user = await isAuthenticatedUser(req);
    const params = parseAndValidateByStageParams(req);
    const { matchQuery, forceEmpty } = await buildByStageMatchQuery(params, user);

    if (forceEmpty) {
      return NextResponse.json(
        {
          contacts: [],
          total: 0,
          page: params.page,
          limit: params.limit,
        },
        { status: 200 }
      );
    }

    const pipeline = buildByStageAggregation({
      matchQuery,
      pipelineObjectId: params.pipelineObjectId,
      stageObjectId: params.stageObjectId,
      page: params.page,
      limit: params.limit,
    });

    const [result] = await Contact.aggregate(pipeline as any[]);
    const contactsResult = result?.contacts ?? [];
    const total = result?.meta?.[0]?.total ?? 0;

    const formattedContacts = contactsResult.map((contact: any) => ({
      ...contact,
      pipelinesActive: (contact.pipelinesActive ?? []).map((pa: any) => ({
        pipeline_id: pa.pipeline_id.toString(),
        stage_id: pa.stage_id.toString(),
        order: pa.order,
      })),
    }));

    return NextResponse.json(
      {
        contacts: formattedContacts,
        total,
        page: params.page,
        limit: params.limit,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching contacts by stage:", error);

    if (error instanceof ByStageApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof Error) {
      if (error.message.includes("No activity recorded")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
