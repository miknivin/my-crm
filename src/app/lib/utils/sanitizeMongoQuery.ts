/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

// === CONFIG ===
const ALLOWED_FIELDS = new Set([
  'name',
  'email',
  'phone',
  'createdAt',
  'updatedAt',
  'source',
  'probability',
  'value',
  'businessName',
  'assignedTo',
  'user',
  'tags.name',
  'pipelinesActive.pipeline_id',
  'pipelinesActive.stage_id',
  'pipelinesActive.order',
]);

const ALLOWED_OPERATORS = new Set([
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$in',
  '$nin',
  '$exists',
  '$and',
  '$or',
  '$not',
  '$nor',
  '$regex',
  '$elemMatch',
  '$size',
  '$all',
]);

const DANGEROUS_KEYS = [
  '$where',
  '$function',
  '$jsonSchema',
  '$accumulator',
  '$out',
  '$merge',
  '__proto__',
  'prototype',
  'constructor',
  'eval',
  'Function',
  'process',
  'require',
  'child_process',
  'delete',
  'update',
  'drop',
  'remove',
  'insert',
];

const ALLOWED_AGG_STAGES = new Set([
  '$match',
  '$group',
  '$project',
  '$sort',
  '$limit',
  '$skip',
  '$unwind',
  '$addFields',
  '$count',
  '$set',
  '$unset',
]);

function assertNoDangerousKeys(obj: any, depth = 0, maxDepth = 8): void {
  if (depth > maxDepth) {
    throw new Error('Aggregation too deeply nested â€” possible attack');
  }

  if (obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(v => assertNoDangerousKeys(v, depth + 1, maxDepth));
    return;
  }

  if (
    obj.hasOwnProperty('__proto__') ||
    obj.hasOwnProperty('prototype') ||
    obj.hasOwnProperty('constructor')
  ) {
    throw new Error('Prototype pollution attempt detected');
  }

  for (const [key, value] of Object.entries(obj)) {
    if (DANGEROUS_KEYS.includes(key)) {
      throw new Error(`Forbidden operator/key: ${key}`);
    }
    assertNoDangerousKeys(value, depth + 1, maxDepth);
  }
}

export function sanitizeAggregatePipeline(
  pipeline: any[],
  options: {
    allowUserField?: boolean;
    maxDepth?: number;
  } = {}
): any[] {
  const { allowUserField = false, maxDepth = 8 } = options;

  if (!Array.isArray(pipeline)) {
    throw new Error('Aggregation pipeline must be an array');
  }

  return pipeline.map(stage => {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) {
      throw new Error('Invalid aggregation stage');
    }
    const entries = Object.entries(stage);
    if (entries.length !== 1) {
      throw new Error('Aggregation stage must have exactly one operator');
    }
    const [op, value] = entries[0];
    if (!ALLOWED_AGG_STAGES.has(op)) {
      throw new Error(`Forbidden aggregation stage: ${op}`);
    }

    if (op === '$match') {
      const cleaned = sanitizeMongoQuery(value, { allowUserField, maxDepth });
      return { [op]: cleaned };
    }

    assertNoDangerousKeys(value, 0, maxDepth);
    return { [op]: value };
  });
}

export function sanitizeMongoQuery(
  input: any,
  options: {
    allowUserField?: boolean;
    maxDepth?: number;
  } = {}
): any {
  const { allowUserField = false, maxDepth = 8 } = options;

  function recurse(obj: any, depth = 0): any {
    if (depth > maxDepth) {
      throw new Error('Query too deeply nested — possible attack');
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // FIX: handle arrays properly
    if (Array.isArray(obj)) {
      return obj.map(v => recurse(v, depth + 1));
    }

    if (obj instanceof mongoose.Types.ObjectId) {
      return obj;
    }

    if (
      obj.hasOwnProperty('__proto__') ||
      obj.hasOwnProperty('prototype') ||
      obj.hasOwnProperty('constructor')
    ) {
      throw new Error('Prototype pollution attempt detected');
    }

    const clean: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (DANGEROUS_KEYS.includes(key)) {
        throw new Error(`Forbidden operator/key: ${key}`);
      }

      if (key.startsWith('$')) {
        if (!ALLOWED_OPERATORS.has(key)) {
          throw new Error(`Forbidden MongoDB operator: ${key}`);
        }

        clean[key] = recurse(value, depth + 1);
        continue;
      }

      const isDotNotation = key.includes('.');

      if (!isDotNotation && !ALLOWED_FIELDS.has(key)) {
        throw new Error(`Forbidden field: ${key}`);
      }

      if (key === 'user') {
        if (!allowUserField) {
          continue;
        }

        if (value instanceof mongoose.Types.ObjectId) {
          clean[key] = value;
        } else {
          throw new Error('Invalid user field value');
        }

        continue;
      }

      clean[key] = recurse(value, depth + 1);
    }

    return clean;
  }

  try {
    return recurse(input);
  } catch (err: any) {
    throw new Error(`Query sanitization failed: ${err.message}`);
  }
}
