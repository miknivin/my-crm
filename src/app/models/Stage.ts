import mongoose, { Document, Types } from 'mongoose';

// Interface for the Stage document fields
interface IStage {
  pipeline_id: Types.ObjectId;
  name: string;
  order: number;
  probability: number;
  created_at: Date;
  updated_at: Date;
}

// Interface for the Stage document (extends Mongoose Document)
interface IStageDocument extends IStage, Document {}

const stageSchema = new mongoose.Schema<IStageDocument>({
  pipeline_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pipeline',
    required: [true, 'Pipeline ID is required'],
  },
  name: {
    type: String,
    required: [true, 'Stage name is required'],
    trim: true,
    maxlength: [200, 'Stage name cannot exceed 200 characters'],
  },
  order: {
    type: Number,
    required: [true, 'Stage order is required'],
    min: [1, 'Order must be at least 1'],
  },
  probability: {
    type: Number,
    required: [true, 'Probability is required'],
    min: [0, 'Probability must be between 0 and 100'],
    max: [100, 'Probability must be between 0 and 100'],
    default: 50,
  },
}, { timestamps: true });

stageSchema.index({ pipeline_id: 1 });
stageSchema.index({ pipeline_id: 1, order: 1 });

stageSchema.pre('save', async function (next) {
  const pipelineExists = await mongoose.model('Pipeline').findById(this.pipeline_id);
  if (!pipelineExists) {
    throw new Error('Invalid pipeline ID');
  }
  next();
});

const Stage = mongoose.models.Stage || mongoose.model<IStageDocument>('Stage', stageSchema);
export default Stage