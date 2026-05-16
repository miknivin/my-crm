import mongoose, { Document, Types, Model } from 'mongoose';

export interface IPipeline {
  name: string;
  notes?: string | null;
  user: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface IPipelineDocument extends IPipeline, Document {}


export interface IPipelineModel extends Model<IPipelineDocument> {
  upsertPipeline(pipelineData: Partial<IPipeline>): Promise<IPipelineDocument>;
}

const pipelineSchema = new mongoose.Schema<IPipelineDocument>({
  name: {
    type: String,
    required: [true, 'Please enter pipeline name'],
    trim: true,
    maxlength: [200, 'Pipeline name cannot exceed 200 characters'],
  },
  notes: {
    type: String,
    required: false,
    maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
  },
}, { timestamps: true });

pipelineSchema.index({ name: 1 }, { unique: true });
pipelineSchema.index({ user: 1 });

pipelineSchema.statics.upsertPipeline = async function (pipelineData: Partial<IPipeline>): Promise<IPipelineDocument> {
  const { name, user } = pipelineData;
  if (!name) {
    throw new Error('Pipeline name is required');
  }
  if (!user || !mongoose.Types.ObjectId.isValid(user)) {
    throw new Error('Invalid user ID');
  }
  const userExists = await mongoose.model('User').findById(user);
  if (!userExists) {
    throw new Error('User does not exist');
  }
  return this.findOneAndUpdate(
    { name },
    { $set: pipelineData },
    { new: true, upsert: true, runValidators: true }
  );
};
const Pipeline = mongoose.models.Pipeline || mongoose.model<IPipelineDocument, IPipelineModel>('Pipeline', pipelineSchema);
export default Pipeline