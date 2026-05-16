/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";

export const buildByStageAggregation = (args: {
  matchQuery: Record<string, any>;
  pipelineObjectId: mongoose.Types.ObjectId;
  stageObjectId: mongoose.Types.ObjectId;
  page: number;
  limit: number;
}) => {
  const { matchQuery, pipelineObjectId, stageObjectId, page, limit } = args;

  return [
    { $match: matchQuery },
    {
      $set: {
        pipelinesActive: {
          $filter: {
            input: "$pipelinesActive",
            as: "pa",
            cond: {
              $and: [
                { $eq: ["$$pa.pipeline_id", pipelineObjectId] },
                { $eq: ["$$pa.stage_id", stageObjectId] },
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        stageOrder: {
          $ifNull: [{ $arrayElemAt: ["$pipelinesActive.order", 0] }, Number.MAX_SAFE_INTEGER],
        },
      },
    },
    { $sort: { stageOrder: 1, _id: 1 } },
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
              pipelinesActive: 1,
            },
          },
          { $unset: ["tagUsers", "assignedUsers", "user", "stageOrder"] },
        ],
        meta: [{ $count: "total" }],
      },
    },
  ];
};
