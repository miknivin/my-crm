/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

const DATE_EXPR_PATTERNS = {
  now: /^new Date\(\)$/i,
  startOfThisWeek:
    /^new Date\(new Date\(\)\.setDate\(new Date\(\)\.getDate\(\) - new Date\(\)\.getDay\(\)\)\)$/i,
  startOfLastWeek:
    /^new Date\(new Date\(\)\.setDate\(new Date\(\)\.getDate\(\) - new Date\(\)\.getDay\(\) - 7\)\)$/i,
};

function computeStartOfThisWeek(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function computeStartOfLastWeek(): Date {
  const startThisWeek = computeStartOfThisWeek();
  const d = new Date(startThisWeek);
  d.setDate(d.getDate() - 7);
  return d;
}

function parseDateExpression(value: string): Date | null {
  if (DATE_EXPR_PATTERNS.now.test(value)) return new Date();
  if (DATE_EXPR_PATTERNS.startOfThisWeek.test(value)) return computeStartOfThisWeek();
  if (DATE_EXPR_PATTERNS.startOfLastWeek.test(value)) return computeStartOfLastWeek();
  return null;
}

export function convertDateExpressions(input: any): any {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(convertDateExpressions);
  if (typeof input !== 'object') return input;

  const result: any = { ...input };
  for (const [key, value] of Object.entries(result)) {
    if (key === 'createdAt' || key === 'updatedAt') {
      if (typeof value === 'string') {
        const exprDate = parseDateExpression(value);
        if (exprDate) {
          result[key] = exprDate;
        } else {
          const parsed = new Date(value);
          if (!isNaN(parsed.getTime())) {
            result[key] = parsed;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        const ops: any = { ...value };
        ['$gte', '$gt', '$lte', '$lt', '$eq'].forEach(op => {
          const v = ops[op];
          if (typeof v === 'string') {
            const exprDate = parseDateExpression(v);
            if (exprDate) {
              ops[op] = exprDate;
            } else {
              const parsed = new Date(v);
              if (!isNaN(parsed.getTime())) {
                ops[op] = parsed;
              }
            }
          }
        });
        result[key] = ops;
      }
    } else {
      result[key] = convertDateExpressions(value);
    }
  }
  return result;
}

export function normalizeIds(obj: any, realUserId: mongoose.Types.ObjectId, parentKey?: string): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (obj === 'ObjectId("USER_ID_PLACEHOLDER")') return realUserId;
    const match = /^ObjectId\("([0-9a-fA-F]{24})"\)$/.exec(obj);
    if (match) return new mongoose.Types.ObjectId(match[1]);
    const isHex24 = /^[0-9a-fA-F]{24}$/.test(obj);
    if (isHex24 && (parentKey === '_id' || parentKey?.endsWith('_id') || parentKey === 'user')) {
      return new mongoose.Types.ObjectId(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) return obj.map(item => normalizeIds(item, realUserId, parentKey));

  if (typeof obj === 'object') {
    if (
      Object.keys(obj).length === 1 &&
      typeof (obj as any).$oid === 'string' &&
      /^[0-9a-fA-F]{24}$/.test((obj as any).$oid)
    ) {
      return new mongoose.Types.ObjectId((obj as any).$oid);
    }
    const result = { ...obj };
    Object.keys(result).forEach(key => {
      result[key] = normalizeIds(result[key], realUserId, key);
    });
    return result;
  }

  return obj;
}

export function buildProjection(filter: any, projection?: Record<string, number>): Record<string, number> {
  const base = projection ? { ...projection } : {};
  if (Object.keys(base).length === 0) {
    base.name = 1;
    base.email = 1;
    base.phone = 1;
    base.createdAt = 1;
  }

  const addField = (field: string) => {
    if (field && !field.startsWith('$')) {
      base[field] = 1;
    }
  };

  const walk = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('$')) {
        walk(value);
      } else {
        addField(key);
        walk(value);
      }
    }
  };

  walk(filter);
  return base;
}
