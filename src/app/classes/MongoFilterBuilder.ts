/* eslint-disable @typescript-eslint/no-explicit-any */
import  mongoose, { Types } from 'mongoose';

const SUCCESS_STAGES = [
  new Types.ObjectId("6858217887f5899a7e6fc6fc"),
  new Types.ObjectId("6858217887f5899a7e6fc6fb"),
  new Types.ObjectId("6858217887f5899a7e6fc6fd"),
];

class MongoFilterBuilder {
  private filter: Record<string, any> = {};
  private current: Record<string, any> = this.filter;


private extractObjectId(input: string): string | null {
  const trimmed = input.trim();

  // Case 1: plain 24-char hex string
  if (/^[a-f\d]{24}$/i.test(trimmed)) {
    return trimmed;
  }

  // Case 2: ObjectId("...") format — extract the hex part
  const match = trimmed.match(/ObjectId\("([a-f\d]{24})"\)/i);
  return match ? match[1] : null;
}
  // ────────────────────────────────────────────────
  // Basic comparison operators
  // ────────────────────────────────────────────────
  eq(field: string, value: any): this {
    this.current[field] = value;
    return this;
  }

  ne(field: string, value: any): this {
    this.current[field] = { $ne: value };
    return this;
  }

  gt(field: string, value: any): this {
    this.current[field] = { $gt: value };
    return this;
  }

  gte(field: string, value: any): this {
    this.current[field] = { $gte: value };
    return this;
  }

  lt(field: string, value: any): this {
    this.current[field] = { $lt: value };
    return this;
  }

  lte(field: string, value: any): this {
    this.current[field] = { $lte: value };
    return this;
  }

  in(field: string, values: any[]): this {
    this.current[field] = { $in: values };
    return this;
  }

  nin(field: string, values: any[]): this {
    this.current[field] = { $nin: values };
    return this;
  }

  // ────────────────────────────────────────────────
  // String / text search
  // ────────────────────────────────────────────────
  contains(field: string, text: string, caseInsensitive = true): this {
    this.current[field] = {
      $regex: text,
      $options: caseInsensitive ? 'i' : ''
    };
    return this;
  }

  // ────────────────────────────────────────────────
  // Existence & emptiness
  // ────────────────────────────────────────────────
  exists(field: string, value = true): this {
    this.current[field] = { $exists: value };
    return this;
  }

  // ────────────────────────────────────────────────
  // assignedTo helpers
  // ────────────────────────────────────────────────
assignedTo(userId: string): this {
  if (!userId) return this;
console.log(userId,'userid');

  const cleanId = this.extractObjectId(userId.toString());
  if (!cleanId) return this;

  this.current["assignedTo.user"] = new mongoose.Types.ObjectId(cleanId);
  return this;
}



  assignedOnlyTo(userId: string | Types.ObjectId): this {
    const oid = new Types.ObjectId(userId);
    this.current.assignedTo = {
      $size: 1,
      $elemMatch: { user: oid }
    };
    return this;
  }

  hasMultipleAssignees(): this {
    this.current["assignedTo.1"] = { $exists: true };
    return this;
  }

  unassigned(): this {
    this.current.$or = [
      { assignedTo: { $exists: false } },
      { assignedTo: { $size: 0 } }
    ];
    return this;
  }

  hasAnyAssignee(): this {
    this.current["assignedTo.0"] = { $exists: true };
    return this;
  }

  // ────────────────────────────────────────────────
  // Converted (success stage) helpers
  // ────────────────────────────────────────────────

  /** Latest pipeline stage is one of the success stages */
  isConverted(): this {
    this.current.$expr = {
      $in: [
        { $let: {
            vars: { last: { $arrayElemAt: ["$pipelinesActive", -1] } },
            in: "$$last.stage_id"
          }},
        SUCCESS_STAGES
      ]
    };
    // Usually want to ensure there is at least one pipeline entry
    this.current["pipelinesActive.0"] = { $exists: true };
    return this;
  }

  /** Has at least one success stage (any position) */
  hasSuccessStage(): this {
    this.current["pipelinesActive.stage_id"] = { $in: SUCCESS_STAGES };
    return this;
  }

  /** No success stage in any pipeline entry */
  notConverted(): this {
    this.current["pipelinesActive.stage_id"] = { $nin: SUCCESS_STAGES };
    return this;
  }

  // ────────────────────────────────────────────────
  // Logical grouping
  // ────────────────────────────────────────────────
  and(callback: (builder: this) => void): this {
    if (!this.current.$and) this.current.$and = [];
    const group: Record<string, any> = {};
    this.current.$and.push(group);
    const previous = this.current;
    this.current = group;
    callback(this);
    this.current = previous;
    return this;
  }

  or(callback: (builder: this) => void): this {
    if (!this.current.$or) this.current.$or = [];
    const group: Record<string, any> = {};
    this.current.$or.push(group);
    const previous = this.current;
    this.current = group;
    callback(this);
    this.current = previous;
    return this;
  }

private normalizeObjectIds(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key of Object.keys(obj)) {
      const value = obj[key];

      // Detect broken / serialized ObjectId shape
      if (value && value.buffer instanceof Uint8Array) {
        try {
          const hex = Buffer.from(value.buffer).toString('hex');
          obj[key] = new mongoose.Types.ObjectId(hex);
        } catch (err) {
          console.warn(`Failed to normalize ObjectId at path "${key}":`, err);
        }
        continue;
      }

      // Detect buffer-like plain object {0:...,1:...,...,11:...}
      if (value && value.buffer && typeof value.buffer === 'object' && !Array.isArray(value.buffer)) {
        const keys = Object.keys(value.buffer);
        const isBufferLike = keys.length === 12 && keys.every(k => /^\d+$/.test(k));
        if (isBufferLike) {
          try {
            const bytes = new Uint8Array(12);
            keys.forEach(k => {
              bytes[Number(k)] = Number(value.buffer[k]);
            });
            const hex = Buffer.from(bytes).toString('hex');
            obj[key] = new mongoose.Types.ObjectId(hex);
          } catch (err) {
            console.warn(`Failed to normalize ObjectId at path "${key}":`, err);
          }
          continue;
        }
      }

      // Recurse into nested objects / arrays
      if (value && typeof value === 'object') {
        this.normalizeObjectIds(value);
      }
    }

    return obj;
  }

  // ────────────────────────────────────────────────
  // Output
  // ────────────────────────────────────────────────
build(): Record<string, any> {
    const cloned = structuredClone(this.filter); // deep copy
    return this.normalizeObjectIds(cloned);
  }

  static create(): MongoFilterBuilder {
    return new MongoFilterBuilder();
  }
}

export default MongoFilterBuilder;
