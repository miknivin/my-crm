import mongoose from "mongoose";
import ActivityLog, { ActivityLogEvent } from "@/app/models/ActivityLog";

interface LogContactActivityInput {
  contactId: string | mongoose.Types.ObjectId;
  event: ActivityLogEvent;
  description: string;
  performedBy: string | mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  session?: mongoose.ClientSession;
}

export async function logContactActivity({
  contactId,
  event,
  description,
  performedBy,
  metadata,
  session,
}: LogContactActivityInput) {
  const [activityLog] = await ActivityLog.create(
    [
      {
        contactId: new mongoose.Types.ObjectId(contactId.toString()),
        event,
        description,
        performedBy: new mongoose.Types.ObjectId(performedBy.toString()),
        metadata: metadata ?? null,
      },
    ],
    { session }
  );

  return activityLog;
}
