/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";

import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import { logContactActivity } from "@/app/api/utils/activityLog";
import dbConnect from "@/app/lib/db/connection";
import CalendarEvent from "@/app/models/CalendarEvents";
import Contact from "@/app/models/Contact";
import Task, { TaskPriority, TaskStatus, TaskType } from "@/app/models/Task";

const allowedPriorities: TaskPriority[] = ["low", "medium", "high"];
const allowedStatuses: TaskStatus[] = ["open", "in_progress", "done"];
const allowedTypes: TaskType[] = ["contact_linked", "custom"];

const parseAssignedTo = (value: unknown) => {
  if (value === undefined || value === null || value === "") return [] as Types.ObjectId[];
  const ids = Array.isArray(value) ? value : [value];
  const uniqueIds = [...new Set(ids.map((id) => String(id)).filter(Boolean))];

  for (const id of uniqueIds) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid assignedTo");
    }
  }

  return uniqueIds.map((id) => new Types.ObjectId(id));
};

const parseDueTime = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  const dueTime = String(value);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) {
    throw new Error("dueTime must be in HH:mm format");
  }
  return dueTime;
};

const getCalendarDateTime = (dueDate: Date, dueTime: string | null) => {
  if (!dueTime) return dueDate;
  const [hours, minutes] = dueTime.split(":").map(Number);
  const calendarDate = new Date(dueDate);
  calendarDate.setHours(hours, minutes, 0, 0);
  return calendarDate;
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");
    const userId = user._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 401 });
    }

    const body = await req.json();
    const type = (body.type || (body.contactId ? "contact_linked" : "custom")) as TaskType;

    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid task type" }, { status: 400 });
    }

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    if (body.contactId && !Types.ObjectId.isValid(body.contactId)) {
      return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
    }

    let assignedTo: Types.ObjectId[] = [];
    try {
      assignedTo = user.role === "admin" ? parseAssignedTo(body.assignedTo) : [];
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Invalid assignedTo" }, { status: 400 });
    }

    if (body.priority && !allowedPriorities.includes(body.priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }

    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (type === "contact_linked") {
      const contact = await Contact.findById(body.contactId).select("_id name").lean();
      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
    }

    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    let dueTime: string | null = null;
    try {
      dueTime = parseDueTime(body.dueTime);
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Invalid dueTime" }, { status: 400 });
    }
    const shouldAddToCalendar = Boolean(body.addToCalendar) && Boolean(dueDate);
    const session = await mongoose.startSession();
    let taskId: Types.ObjectId | undefined;

    try {
      await session.withTransaction(async () => {
        const [task] = await Task.create(
          [
            {
              title: body.title,
              description: body.description || null,
              type,
              contactId: type === "contact_linked" ? new Types.ObjectId(body.contactId) : null,
              assignedTo,
              dueDate,
              dueTime,
              priority: body.priority || "medium",
              status: body.status || "open",
              owner: new Types.ObjectId(userId),
              createdBy: new Types.ObjectId(userId),
            },
          ],
          { session }
        );
        taskId = task._id as Types.ObjectId;

        if (task.contactId) {
          await logContactActivity({
            contactId: task.contactId,
            event: "TASK_CREATED",
            description: `Task created: ${task.title}`,
            performedBy: userId,
            metadata: {
              taskId: task._id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              dueTime: task.dueTime,
              addToCalendar: shouldAddToCalendar,
            },
            session,
          });
        }

        if (shouldAddToCalendar && dueDate) {
          const calendarDate = getCalendarDateTime(dueDate, task.dueTime ?? null);
          await CalendarEvent.create(
            [
              {
                title: task.title,
                start: calendarDate.toISOString(),
                end: calendarDate.toISOString(),
                allDay: !task.dueTime,
                extendedProps: { calendar: task.priority === "high" ? "Danger" : "Primary" },
                task: task._id,
                contact: task.contactId ?? null,
                user: task.assignedTo[0] ?? task.owner,
              },
            ],
            { session }
          );
        }
      });
    } finally {
      await session.endSession();
    }

    const populatedTask = await Task.findById(taskId)
      .populate("contactId", "name")
      .populate("assignedTo", "name email")
      .populate("owner", "name email")
      .populate("createdBy", "name email")
      .lean();

    return NextResponse.json({ message: "Task created successfully", task: populatedTask }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");
    const userId = user._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    const assignedTo = searchParams.get("assignedTo");
    const status = searchParams.get("status");
    const dueStartDate = searchParams.get("dueStartDate");
    const dueEndDate = searchParams.get("dueEndDate");
    const updatedStartDate = searchParams.get("updatedStartDate");
    const updatedEndDate = searchParams.get("updatedEndDate");
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 12), 1), 100);
    const skip = (page - 1) * limit;
    const query: Record<string, any> = {};

    if (contactId) {
      if (!Types.ObjectId.isValid(contactId)) {
        return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
      }
      query.contactId = new Types.ObjectId(contactId);
    } else if (user.role === "team_member") {
      query.$or = [
        { assignedTo: new mongoose.Types.ObjectId(userId) },
        { owner: new mongoose.Types.ObjectId(userId) },
        { createdBy: new mongoose.Types.ObjectId(userId) },
      ];
    }

    if (assignedTo && user.role === "admin") {
      try {
        const selectedUsers = JSON.parse(assignedTo) as { _id: string; isNot?: boolean }[];
        const includeIds = selectedUsers
          .filter((item) => !item.isNot && Types.ObjectId.isValid(item._id))
          .map((item) => new Types.ObjectId(item._id));
        const excludeIds = selectedUsers
          .filter((item) => item.isNot && Types.ObjectId.isValid(item._id))
          .map((item) => new Types.ObjectId(item._id));

        if (includeIds.length > 0 || excludeIds.length > 0) {
          query.assignedTo = {};
          if (includeIds.length > 0) query.assignedTo.$in = includeIds;
          if (excludeIds.length > 0) query.assignedTo.$nin = excludeIds;
        }
      } catch {
        return NextResponse.json({ error: "Invalid assignedTo filter" }, { status: 400 });
      }
    }

    if (status) {
      if (!allowedStatuses.includes(status as TaskStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      query.status = status;
    }

    if (dueStartDate || dueEndDate) {
      query.dueDate = {};
      if (dueStartDate) {
        const start = new Date(dueStartDate);
        start.setHours(0, 0, 0, 0);
        query.dueDate.$gte = start;
      }
      if (dueEndDate) {
        const end = new Date(dueEndDate);
        end.setHours(23, 59, 59, 999);
        query.dueDate.$lte = end;
      }
    }

    if (updatedStartDate || updatedEndDate) {
      query.updatedAt = {};
      if (updatedStartDate) {
        const start = new Date(updatedStartDate);
        start.setHours(0, 0, 0, 0);
        query.updatedAt.$gte = start;
      }
      if (updatedEndDate) {
        const end = new Date(updatedEndDate);
        end.setHours(23, 59, 59, 999);
        query.updatedAt.$lte = end;
      }
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate("contactId", "name")
        .populate("assignedTo", "name email")
        .populate("owner", "name email")
        .populate("createdBy", "name email")
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
