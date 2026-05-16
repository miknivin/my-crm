/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { isAuthenticatedUser } from "@/app/api/middlewares/auth";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";
import Pipeline from "@/app/models/Pipeline";
import Stage from "@/app/models/Stage";
import User from "@/app/models/User";

const parseAssignedTo = (raw: string | null): Array<{ _id: string; isNot: boolean }> => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    if (mongoose.Types.ObjectId.isValid(raw)) {
      return [{ _id: raw, isNot: false }];
    }
  }

  return [];
};

export async function GET(req: NextRequest) {
  try {
    Pipeline;
    User;
    Stage;

    await dbConnect();

    const user = await isAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);

    const pipelineId = searchParams.get("pipelineId");
    const source = searchParams.get("source");
    const keyword = searchParams.get("keyword");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!pipelineId) {
      return NextResponse.json({ error: "pipelineId is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(pipelineId)) {
      return NextResponse.json({ error: "Invalid pipelineId" }, { status: 400 });
    }

    if (Number.isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
    }

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Invalid limit (must be 1-100)" }, { status: 400 });
    }

    if (startDate && Number.isNaN(Date.parse(startDate))) {
      return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
    }

    if (endDate && Number.isNaN(Date.parse(endDate))) {
      return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
    }

    const assignedTo = parseAssignedTo(searchParams.get("assignedTo"));

    const matchQuery: Record<string, any> = {
      "pipelinesActive.pipeline_id": new mongoose.Types.ObjectId(pipelineId),
    };

    if (user?.role === "team_member") {
      matchQuery["assignedTo.user"] = new mongoose.Types.ObjectId(user._id);
    } else if (assignedTo.length > 0) {
      const includeIds = assignedTo
        .filter((item) => !item.isNot && mongoose.Types.ObjectId.isValid(item._id))
        .map((item) => new mongoose.Types.ObjectId(item._id));
      const excludeIds = assignedTo
        .filter((item) => item.isNot && mongoose.Types.ObjectId.isValid(item._id))
        .map((item) => new mongoose.Types.ObjectId(item._id));

      if (includeIds.length > 0 || excludeIds.length > 0) {
        matchQuery["assignedTo.user"] = {};
        if (includeIds.length > 0) matchQuery["assignedTo.user"].$in = includeIds;
        if (excludeIds.length > 0) matchQuery["assignedTo.user"].$nin = excludeIds;
      }
    }

    if (source) matchQuery.source = source;

    if (keyword) {
      const regex = new RegExp(keyword, "i");
      matchQuery.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { notes: regex },
        { businessName: regex },
      ];
    }

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchQuery.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $set: {
          pipelineActiveForPipeline: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$pipelinesActive",
                  as: "pa",
                  cond: { $eq: ["$$pa.pipeline_id", new mongoose.Types.ObjectId(pipelineId)] },
                },
              },
              0,
            ],
          },
        },
      },
      { $match: { pipelineActiveForPipeline: { $ne: null } } },
      {
        $lookup: {
          from: "stages",
          localField: "pipelineActiveForPipeline.stage_id",
          foreignField: "_id",
          as: "stageDoc",
        },
      },
      {
        $set: {
          stageDoc: { $arrayElemAt: ["$stageDoc", 0] },
          stageSortOrder: {
            $ifNull: [{ $getField: { field: "order", input: { $arrayElemAt: ["$stageDoc", 0] } } }, Number.MAX_SAFE_INTEGER],
          },
          contactSortOrder: {
            $ifNull: ["$pipelineActiveForPipeline.order", Number.MAX_SAFE_INTEGER],
          },
        },
      },
      { $sort: { stageSortOrder: 1, contactSortOrder: 1, _id: 1 } },
      {
        $facet: {
          contacts: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "users",
                localField: "tags.user",
                foreignField: "_id",
                as: "tagUsers",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "assignedTo.user",
                foreignField: "_id",
                as: "assignedUsers",
              },
            },
            {
              $project: {
                name: 1,
                email: 1,
                phone: 1,
                notes: 1,
                source: 1,
                businessName: 1,
                probability: 1,
                value: 1,
                createdAt: 1,
                updatedAt: 1,
                user: {
                  name: "$user.name",
                  email: "$user.email",
                },
                tags: {
                  $map: {
                    input: "$tags",
                    as: "tag",
                    in: {
                      name: "$$tag.name",
                      user: {
                        $let: {
                          vars: {
                            userDoc: {
                              $arrayElemAt: [
                                "$tagUsers",
                                { $indexOfArray: ["$tagUsers._id", "$$tag.user"] },
                              ],
                            },
                          },
                          in: {
                            name: "$$userDoc.name",
                            email: "$$userDoc.email",
                          },
                        },
                      },
                    },
                  },
                },
                assignedTo: {
                  $map: {
                    input: "$assignedTo",
                    as: "assign",
                    in: {
                      time: "$$assign.time",
                      user: {
                        $let: {
                          vars: {
                            userDoc: {
                              $arrayElemAt: [
                                "$assignedUsers",
                                { $indexOfArray: ["$assignedUsers._id", "$$assign.user"] },
                              ],
                            },
                          },
                          in: {
                            _id: "$$assign.user",
                            name: "$$userDoc.name",
                            email: "$$userDoc.email",
                          },
                        },
                      },
                    },
                  },
                },
                pipelinesActive: ["$pipelineActiveForPipeline"],
              },
            },
            { $unset: ["tagUsers", "assignedUsers", "user"] },
          ],
          meta: [{ $count: "total" }],
        },
      },
    ];

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
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching contacts by pipeline:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
