import mongoose, { Schema } from "mongoose";

// Define the interface for the CalendarEvent document
interface ICalendarEvent  {
  _id?: mongoose.Types.ObjectId;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps: {
    calendar: string;
  };
  user?:string;
}

// Define the Mongoose schema
const CalendarEventSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    start: {
      type: String,
      required: true,
    },
    end: {
      type: String,
      default: null,
    },
    allDay: {
      type: Boolean,
      default: true,
    },
    extendedProps: {
      calendar: {
        type: String,
        required: true,
        enum: ["Danger", "Success", "Primary", "Warning"],
      },
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    contact: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
    },
     user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true, 
  }
);

// Export the model, ensuring it’s only created once
const CalendarEvent = mongoose.models.CalendarEvent ||
mongoose.model<ICalendarEvent>("CalendarEvent", CalendarEventSchema);

export default CalendarEvent
