import { Types } from 'mongoose';

interface PipelineRequest {
  name: string;
  notes?: string;
  userId: string;
  stages?: { name: string; order: number; probability: number }[];
}

export function validatePipelineCreate(data: PipelineRequest): { error?: string } {
  // Validate pipeline name
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { error: 'Pipeline name is required' };
  }

  // Validate userId
  if (!data.userId || !Types.ObjectId.isValid(data.userId)) {
    return { error: 'Invalid user ID' };
  }

  // Validate stages if provided
  if (data.stages) {
    if (!Array.isArray(data.stages)) {
      return { error: 'Stages must be an array' };
    }

    for (const stage of data.stages) {
      if (!stage.name || typeof stage.name !== 'string' || stage.name.trim().length === 0) {
        return { error: 'Stage name is required' };
      }
      if (typeof stage.order !== 'number' || stage.order < 1 || !Number.isInteger(stage.order)) {
        return { error: 'Stage order must be a positive integer' };
      }
      if (typeof stage.probability !== 'number' || stage.probability < 0 || stage.probability > 100) {
        return { error: 'Stage probability must be between 0 and 100' };
      }
    }

    // Check for duplicate stage names or orders
    const stageNames = data.stages.map((s) => s.name);
    const stageOrders = data.stages.map((s) => s.order);
    if (new Set(stageNames).size !== stageNames.length) {
      return { error: 'Stage names must be unique' };
    }
    if (new Set(stageOrders).size !== stageOrders.length) {
      return { error: 'Stage orders must be unique' };
    }
  }

  return {};
}