/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { PipelineStage } from 'mongoose';

type GroupByField = string | string[];

class MongoAggregateBuilder<T = any> {
  protected pipeline: PipelineStage[] = [];

  constructor(private model: mongoose.Model<T>) {}

  // ────────────────────────────────────────────────
  // ObjectId normalizer
  //
  private normalizeObjectIds(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key of Object.keys(obj)) {
      const value = obj[key];

      // Case 1 – broken / serialized ObjectId shape { buffer: Uint8Array }
      if (value && value.buffer instanceof Uint8Array) {
        try {
          const hex = Buffer.from(value.buffer).toString('hex');
          obj[key] = new mongoose.Types.ObjectId(hex);
        } catch (err) {
          console.warn(`Failed to normalize ObjectId at path "${key}":`, err);
        }
        continue;
      }

      // Case 2 – plain 24-char hex string that looks like an ObjectId
      if (
        typeof value === 'string' &&
        /^[a-f\d]{24}$/i.test(value)
      ) {
        try {
          obj[key] = new mongoose.Types.ObjectId(value);
        } catch (err) {
          console.warn(`Failed to coerce string to ObjectId at path "${key}":`, err);
        }
        continue;
      }

      // Recurse into nested objects / arrays
      if (value && typeof value === 'object') {
        this.normalizeObjectIds(value);
      }
    }

    return obj;
  }

  // ────────────────────────────────────────────────
  // Starting point: match / filter
  // ────────────────────────────────────────────────
  match(filter: Record<string, any>): this {
    if (Object.keys(filter).length > 0) {
      this.pipeline.push({ $match: this.normalizeObjectIds(filter) });
    }
    return this;
  }

  // ────────────────────────────────────────────────
  // Grouping (most important for charts)
  // ────────────────────────────────────────────────
  groupBy(by: GroupByField, metrics: Record<string, any> = {}): this {
    const _id: any =
      typeof by === 'string' ? `$${by}` : by.map((f) => `$${f}`);
    this.pipeline.push({
      $group: {
        _id,
        ...metrics,
        count: { $sum: 1 },
      },
    });
    return this;
  }

  // Convenience methods for common metrics
count(): this {

const alreadyGrouped = this.pipeline.some(
  (stage): stage is PipelineStage.Group => '$group' in stage
);
  if (alreadyGrouped) {
    return this; // ❌ prevent breaking grouped results
  }

  this.pipeline.push({
    $count: "total"
  });

  return this;
}

  sum(field: string, as = 'sum'): this {
    this.pipeline.push({
      $group: {
        _id: null,
        [as]: { $sum: `$${field}` },
      },
    });
    return this;
  }

  avg(field: string, as = 'avg'): this {
    this.pipeline.push({
      $group: {
        _id: null,
        [as]: { $avg: `$${field}` },
      },
    });
    return this;
  }

  // ────────────────────────────────────────────────
  // Sorting & limiting
  // ────────────────────────────────────────────────
  sort(sort: Record<string, 1 | -1 | 'asc' | 'desc'>): this {
    const normalized: Record<string, 1 | -1> = {};
    for (const [key, dir] of Object.entries(sort)) {
      normalized[key] = dir === 'asc' || dir === 1 ? 1 : -1;
    }
    this.pipeline.push({ $sort: normalized });
    return this;
  }

  limit(n: number): this {
    this.pipeline.push({ $limit: n });
    return this;
  }

  // ────────────────────────────────────────────────
  // Project / reshape output
  // ────────────────────────────────────────────────
  project(projection: Record<string, any>): this {
    this.pipeline.push({ $project: projection });
    return this;
  }

  // ────────────────────────────────────────────────
  // Unwind (useful when grouping by array fields)
  // ────────────────────────────────────────────────
  unwind(path: string, preserveNullAndEmptyArrays = false): this {
    this.pipeline.push({
      $unwind: {
        path: `$${path}`,
        preserveNullAndEmptyArrays,
      },
    });
    return this;
  }

  // ────────────────────────────────────────────────
  // Lookup (join with other collections)
  // ────────────────────────────────────────────────
  lookup(
    from: string,
    localField: string,
    foreignField: string,
    as: string,
  ): this {
    this.pipeline.push({ $lookup: { from, localField, foreignField, as } });
    return this;
  }

  // ────────────────────────────────────────────────
  // Execute
  // ────────────────────────────────────────────────
  async exec(): Promise<any[]> {
    return this.model.aggregate(this.pipeline).exec();
  }

  // For debugging
  getPipeline(): PipelineStage[] {
    return [...this.pipeline];
  }

  // Reset if needed
  reset(): this {
    this.pipeline = [];
    return this;
  }

  static forModel<T>(model: mongoose.Model<T>): MongoAggregateBuilder<T> {
    return new MongoAggregateBuilder<T>(model);
  }
}

export default MongoAggregateBuilder;