/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";

import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import { logContactActivity } from "@/app/api/utils/activityLog";
import dbConnect from "@/app/lib/db/connection";
import CalendarEvent from "@/app/models/CalendarEvents";
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

const isTaskOwner = (task: { owner?: unknown }, userId: string) => {
  return task.owner?.toString() === userId;
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");
    const userId = user._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description || null;
    if (body.type !== undefined) {
      if (!allowedTypes.includes(body.type)) return NextResponse.json({ error: "Invalid task type" }, { status: 400 });
      update.type = body.type;
    }
    if (body.contactId !== undefined) {
      if (body.contactId && !Types.ObjectId.isValid(body.contactId)) {
        return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
      }
      update.contactId = body.contactId ? new Types.ObjectId(body.contactId) : null;
    }
    if (body.assignedTo !== undefined) {
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Only admins can update assigned users" }, { status: 403 });
      }
      try {
        update.assignedTo = parseAssignedTo(body.assignedTo);
      } catch (error: any) {
        return NextResponse.json({ error: error.message || "Invalid assignedTo" }, { status: 400 });
      }
    }
    if (body.dueDate !== undefined) update.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.dueTime !== undefined) {
      try {
        update.dueTime = parseDueTime(body.dueTime);
      } catch (error: any) {
        return NextResponse.json({ error: error.message || "Invalid dueTime" }, { status: 400 });
      }
    }
    if (body.priority !== undefined) {
      if (!allowedPriorities.includes(body.priority)) return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      update.priority = body.priority;
    }
    if (body.status !== undefined) {
      if (!allowedStatuses.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      update.status = body.status;
    }

    const session = await mongoose.startSession();
    let taskId: Types.ObjectId | undefined;

    try {
      await session.withTransaction(async () => {
        const task = await Task.findById(id).session(session);
        if (!task) {
          throw new Error("Task not found");
        }

        const isAdmin = user.role === "admin";
        const canManageTask = isAdmin || isTaskOwner(task, userId);
        const updatedFields = Object.keys(update);
        const statusOnlyUpdate = updatedFields.length > 0 && updatedFields.every((field) => field === "status");

        if (!canManageTask && !statusOnlyUpdate) {
          throw new Error("Only admins or the task owner can edit task details");
        }

        const oldValues = {
          title: task.title,
          description: task.description,
          assignedTo: task.assignedTo.map((assignee) => assignee.toString()),
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          priority: task.priority,
          status: task.status,
        };

        Object.assign(task, update);
        await task.save({ session });
        taskId = task._id as Types.ObjectId;

        if (task.contactId) {
          await logContactActivity({
            contactId: task.contactId,
            event: "TASK_UPDATED",
            description: `Task updated: ${task.title}`,
            performedBy: userId,
            metadata: { taskId: task._id, oldValues, updatedFields: update, addToCalendar: Boolean(body.addToCalendar) },
            session,
          });
        }

        if (Boolean(body.addToCalendar) && task.dueDate) {
          const calendarDate = getCalendarDateTime(task.dueDate, task.dueTime ?? null);
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

    return NextResponse.json({ message: "Task updated successfully", task: populatedTask }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating task:", error);
    const isPermissionError = error.message?.includes("Only admins or the task owner");
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Task not found" ? 404 : isPermissionError ? 403 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");
    const userId = user._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const task = await Task.findById(id).session(session);
        if (!task) {
          throw new Error("Task not found");
        }

        if (user.role !== "admin" && !isTaskOwner(task, userId)) {
          throw new Error("Only admins or the task owner can delete this task");
        }

        if (task.contactId) {
          await logContactActivity({
            contactId: task.contactId,
            event: "TASK_DELETED",
            description: `Task deleted: ${task.title}`,
            performedBy: userId,
            metadata: { taskId: task._id, title: task.title, status: task.status },
            session,
          });
        }

        await CalendarEvent.deleteMany({ task: task._id }).session(session);
        await task.deleteOne({ session });
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting task:", error);
    const isPermissionError = error.message?.includes("Only admins or the task owner");
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Task not found" ? 404 : isPermissionError ? 403 : 500 }
    );
  }
}
