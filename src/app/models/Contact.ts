import mongoose, { Document, Schema, Model, Types, model, ClientSession } from 'mongoose';
import ActivityArchive from './ActivityArchive';

// Subdocument interfaces
export interface AssignedTo {
  user: Types.ObjectId;
  time: Date;
}

export interface PipelineActive {
  order: number;
  pipeline_id: Types.ObjectId;
  stage_id: Types.ObjectId;
}

export interface Tag {
  user: Types.ObjectId;
  name: string;
}

export interface Activity {
  action:
    | 'CONTACT_CREATED'
    | 'CONTACT_UPDATED'
    | 'TAG_ADDED'
    | 'TAG_REMOVED'
    | 'NOTE_ADDED'
    | 'NOTE_UPDATED'
    | 'PIPELINE_ADDED'
    | 'PIPELINE_STAGE_UPDATED'
    | 'ASSIGNED_TO_UPDATED';
  user: Types.ObjectId;
  details: Record<string, unknown>;
  createdAt: Date;
}

export interface Remark {
  text: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

// Main Contact interface
export interface IContact extends Document {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  assignedTo: Types.DocumentArray<AssignedTo>;
  pipelinesActive: Types.DocumentArray<PipelineActive>;
  tags: Types.DocumentArray<Tag>;
  user?: Types.ObjectId;
  uid?: number;
  businessName?:string;
  activities: Types.DocumentArray<Activity>;
  remarks: Types.DocumentArray<Remark>;
  createdAt: Date;
  updatedAt: Date;
  source?: string;
  probability?:number;
  value?:number;
  // Instance method
  logActivity(
    action: Activity['action'],
    userId: Types.ObjectId,
    details?: Record<string, unknown>,
    session?: ClientSession
  ): Promise<void>;
}

// Static methods
interface ContactModel extends Model<IContact> {
  upsertContact(contactData: Partial<IContact>, userId: Types.ObjectId, session?: ClientSession): Promise<IContact>;
}

const contactSchema = new Schema<IContact, ContactModel>(
  {
    name: {
      type: String,
      required: [true, 'Please enter contact name'],
      maxLength: [200, 'Contact name cannot exceed 200 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please enter contact email'],
      unique: true,
    },
    businessName: {
      type: String,
    },
    phone: {
      type: String,
      required: [true, 'Please enter phone number'],
      unique: true,
    },
    notes: {
      type: String,
      maxLength: [5000, 'Description cannot exceed 5000 characters'],
    },
    assignedTo: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        time: { type: Date, default: Date.now },
      },
    ],
    pipelinesActive: [
      {
        pipeline_id: {
          type: Schema.Types.ObjectId,
          ref: 'Pipeline',
          required: [true, 'Pipeline ID is required'],
        },
        stage_id: {
          type: Schema.Types.ObjectId,
          ref: 'Stage',
          required: [true, 'Stage ID is required'],
        },
        order: {
          type: Number,
          required: [true, 'Order is required'],
          default: 0,
        },
      },
    ],
    tags: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
      },
    ],
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    uid: {
      type: Number,
    },
    source: {
      type: String,
      default: "manual",
    },
    probability:{
      type:Number,
      default:50
    },
    value:{
      type:Number,
      default:0
    },
    activities: [
      {
        action: {
          type: String,
          required: true,
          enum: [
            'CONTACT_CREATED',
            'CONTACT_UPDATED',
            'TAG_ADDED',
            'TAG_REMOVED',
            'NOTE_ADDED',
            'NOTE_UPDATED',
            'PIPELINE_ADDED',
            'PIPELINE_STAGE_UPDATED',
            'ASSIGNED_TO_UPDATED',
          ],
        },
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        details: {
          type: Object,
          default: {},
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    remarks: [
      {
        text: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

contactSchema.path('assignedTo').default([]);
contactSchema.path('pipelinesActive').default([]);
contactSchema.path('tags').default([]);
contactSchema.path('activities').default([]);
contactSchema.path('remarks').default([]);
// Validate pipeline_id and stage_id before saving
contactSchema.pre('save', async function (next) {
  try {
    // Validate pipelinesActive
    for (const pipelineActive of this.pipelinesActive) {
      const pipeline = await mongoose.model('Pipeline').findById(pipelineActive.pipeline_id);
      if (!pipeline) {
        throw new Error(`Invalid pipeline ID: ${pipelineActive.pipeline_id}`);
      }
      const stage = await mongoose.model('Stage').findOne({
        _id: pipelineActive.stage_id,
        pipeline_id: pipelineActive.pipeline_id,
      });
      if (!stage) {
        throw new Error(`Invalid stage ID: ${pipelineActive.stage_id} for pipeline ${pipelineActive.pipeline_id}`);
      }
    }

    // Cap activities at 500 and archive older ones
    const ACTIVITY_CAP = 500;
    if (this.activities.length > ACTIVITY_CAP) {
      const activitiesToArchive = this.activities.slice(0, this.activities.length - ACTIVITY_CAP);
      await ActivityArchive.insertMany(
        activitiesToArchive.map((activity) => ({
          contact: this._id,
          action: activity.action,
          user: activity.user,
          details: activity.details,
          createdAt: activity.createdAt,
        }))
      );
      this.activities.splice(0, this.activities.length - ACTIVITY_CAP);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Utility method to log an activity
contactSchema.methods.logActivity = async function (
  action: Activity['action'],
  userId: Types.ObjectId,
  details: Record<string, unknown> = {},
  session?: ClientSession
) {
  // Log the activity
  this.activities.push({
    action,
    user: userId,
    details,
    createdAt: new Date(),
  });
  await this.save({ session });
};
// Static method to upsert contact
contactSchema.statics.upsertContact = async function (contactData: Partial<IContact>, userId: Types.ObjectId, session?: ClientSession) {
  const isNewContact = !(await this.exists({ email: contactData.email }).session(session ?? null));
  const updatedContact = await this.findOneAndUpdate(
    { email: contactData.email },
    { $set: contactData },
    { new: true, upsert: true, runValidators: true, session }
  );

  // Log activity
  await updatedContact.logActivity(isNewContact ? 'CONTACT_CREATED' : 'CONTACT_UPDATED', userId, {
    updatedFields: contactData,
  });

  return updatedContact;
};

// Add text index for full-text search
contactSchema.index({
  name: 'text',
  email: 'text',
  phone: 'text',
  notes: 'text',
  'tags.name': 'text',
});

// Add indexes for efficient querying
contactSchema.index({ 'pipelinesActive.pipeline_id': 1 });
contactSchema.index({ 'pipelinesActive.stage_id': 1 });
contactSchema.index({ 'activities.createdAt': -1 });
contactSchema.index({ 'remarks.createdAt': -1 });

let Contact: ContactModel;
try {
  Contact = mongoose.model<IContact, ContactModel>('Contact');
} catch {
  Contact = model<IContact, ContactModel>('Contact', contactSchema);
}

export default Contact;
