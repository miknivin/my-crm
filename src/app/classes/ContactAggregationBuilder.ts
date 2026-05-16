import mongoose from 'mongoose';
import MongoAggregateBuilder from './MongoAggregationBuilder';
import Contact, { IContact } from '../models/Contact';
import { parseSafeDate } from '@/helpers/parseSafeDate';

// ─────────────────────────────────────────────────────────────
// Stage IDs that represent a successful / converted contact
// ─────────────────────────────────────────────────────────────
export const SUCCESS_STAGE_IDS = [
  '6858217887f5899a7e6fc6fc',
  '6858217887f5899a7e6fc6fb',
  '6858217887f5899a7e6fc6fd',
] as const;

// ─────────────────────────────────────────────────────────────
// Result shape helpers
// ─────────────────────────────────────────────────────────────
export interface ConversionRateResult {
  totalConverted: number;
  totalContacts: number;
  conversionRate: number; // 0–100 (%)
}

export interface TotalValueResult {
  totalValue: number;
  avgValue: number;
}

export interface GroupResult {
  _id: unknown;
  count: number;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────
// ContactAggregationBuilder
// ─────────────────────────────────────────────────────────────
class ContactAggregationBuilder extends MongoAggregateBuilder<IContact> {
  constructor() {
    super(Contact);
  }

  // ── Helpers ───────────────────────────────────────────────

  /** Converts the SUCCESS_STAGE_IDS constants to ObjectId instances */
  private successStageObjectIds(): mongoose.Types.ObjectId[] {
    return SUCCESS_STAGE_IDS.map((id) => new mongoose.Types.ObjectId(id));
  }


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

  // ── Filters ──────────────────────────────────────────────

  /** Filter contacts that belong to a specific pipeline */
  filterByPipeline(pipelineId: string | mongoose.Types.ObjectId): this {
    return this.match({
      'pipelinesActive.pipeline_id': new mongoose.Types.ObjectId(pipelineId),
    });
  }

  /** Filter contacts currently in a specific stage */
  filterByStage(stageId: string | mongoose.Types.ObjectId): this {
    return this.match({
      'pipelinesActive.stage_id': new mongoose.Types.ObjectId(stageId),
    });
  }

  /** Filter contacts that have at least one of the given tag names */
  filterByTag(tagNames: string | string[]): this {
    const names = Array.isArray(tagNames) ? tagNames : [tagNames];
    return this.match({ 'tags.name': { $in: names } });
  }

  /** Filter contacts assigned to a specific user */
  filterByAssignedUser(userId: string | mongoose.Types.ObjectId): this {
    if (!userId) return this;
    const cleanId = this.extractObjectId(userId.toString());
   if (!cleanId) return this;

    return this.match({
      'assignedTo.user': new mongoose.Types.ObjectId(cleanId),
    });
  }

  /** Filter contacts by their source (e.g. "manual", "import", "api") */
  filterBySource(source: string | string[]): this {
    const value = Array.isArray(source) ? { $in: source } : source;
    return this.match({ source: value });
  }

  /** Filter contacts created within a date range */
filterByCreatedAt(from?: string | Date, to?: string | Date): this {
  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (typeof from === 'string') fromDate = parseSafeDate(from);
  else fromDate = from;

  if (typeof to === 'string') toDate = parseSafeDate(to);
  else toDate = to;

  const condition: Record<string, Date> = {};
  if (fromDate) condition['$gte'] = fromDate;
  if (toDate) condition['$lte'] = toDate;
  if (Object.keys(condition).length === 0) return this;

  return this.match({ createdAt: condition });
}


  groupByTime(unit: "day" | "week" | "month" | "year", field = "createdAt") {
    this.pipeline.push({
      $group: {
        _id: {
          $dateTrunc: {
            date: `$${field}`,
            unit: unit
          }
        },
        count: { $sum: 1 }
      }
    });
    
    this.pipeline.push({
      $sort: { _id: 1 }
    });

    return this;
  }
  /** Filter contacts that are in any of the success/converted stages */
  filterConverted(): this {
    return this.match({
      'pipelinesActive.stage_id': { $in: this.successStageObjectIds() },
    });
  }

  // ── Group-bys ────────────────────────────────────────────

  /**
   * Unwinds pipelinesActive and groups by pipeline_id.
   * Each result: { _id: ObjectId, count: number }
   */
  groupByPipeline(metrics: Record<string, unknown> = {}): this {
    this.unwind('pipelinesActive', true);
    return this.groupBy('pipelinesActive.pipeline_id', metrics);
  }

  /**
   * Unwinds pipelinesActive and groups by stage_id.
   * Each result: { _id: ObjectId, count: number }
   */
  groupByStage(metrics: Record<string, unknown> = {}): this {
    this.unwind('pipelinesActive', true);
    return this.groupBy('pipelinesActive.stage_id', metrics);
  }

  /**
   * Unwinds tags and groups by tag name.
   * Each result: { _id: string, count: number }
   */
  groupByTag(metrics: Record<string, unknown> = {}): this {
    this.unwind('tags', true);
    return this.groupBy('tags.name', metrics);
  }

  /**
   * Unwinds assignedTo and groups by assigned user.
   * Each result: { _id: ObjectId, count: number }
   */
  groupByAssignedUser(metrics: Record<string, unknown> = {}): this {
    this.unwind('assignedTo', true);
    return this.groupBy('assignedTo.user', metrics);
  }

  /** Group all contacts by their source field. */
  groupBySource(metrics: Record<string, unknown> = {}): this {
    return this.groupBy('source', metrics);
  }

  // ── Convenience executions ───────────────────────────────

  /**
   * Returns the number of contacts whose active stage is one of the
   * SUCCESS_STAGE_IDS, optionally scoped to a specific pipeline.
   */
  async totalConverted(pipelineId?: string | mongoose.Types.ObjectId): Promise<number> {
    const builder = new ContactAggregationBuilder();

    if (pipelineId) builder.filterByPipeline(pipelineId);

    builder
      .match({ 'pipelinesActive.stage_id': { $in: this.successStageObjectIds() } })
      .count();

    const result = await builder.exec();
    return result[0]?.total ?? 0;
  }

  /**
   * Returns conversion rate as a percentage alongside raw counts.
   * Optionally scoped to a pipeline.
   */
  async conversionRate(pipelineId?: string | mongoose.Types.ObjectId): Promise<ConversionRateResult> {
    const [totalContacts, totalConverted] = await Promise.all([
      (async () => {
        const b = new ContactAggregationBuilder();
        if (pipelineId) b.filterByPipeline(pipelineId);
        b.count();
        const r = await b.exec();
        return r[0]?.total ?? 0;
      })(),
      this.totalConverted(pipelineId),
    ]);

    const rate = totalContacts > 0 ? (totalConverted / totalContacts) * 100 : 0;

    return {
      totalConverted,
      totalContacts,
      conversionRate: Math.round(rate * 100) / 100,
    };
  }

  /**
   * Returns total and average deal value across all contacts (or filtered subset).
   * Apply any match/filter calls BEFORE calling this.
   */
  async totalValue(): Promise<TotalValueResult> {
    const pipeline = this.getPipeline();

    pipeline.push({
      $group: {
        _id: null,
        totalValue: { $sum: '$value' },
        avgValue: { $avg: '$value' },
      },
    });

    const result = await Contact.aggregate(pipeline).exec();
    return {
      totalValue: result[0]?.totalValue ?? 0,
      avgValue: Math.round((result[0]?.avgValue ?? 0) * 100) / 100,
    };
  }

  /**
   * Returns converted contacts grouped by stage_id so you can see
   * which success stage they ended up in.
   */
  async convertedByStage(pipelineId?: string | mongoose.Types.ObjectId): Promise<GroupResult[]> {
    const builder = new ContactAggregationBuilder();

    if (pipelineId) builder.filterByPipeline(pipelineId);

    builder
      .match({ 'pipelinesActive.stage_id': { $in: this.successStageObjectIds() } })
      .unwind('pipelinesActive', false)
      .match({ 'pipelinesActive.stage_id': { $in: this.successStageObjectIds() } })
      .groupBy('pipelinesActive.stage_id')
      .sort({ count: -1 });

    return builder.exec();
  }

  // ── Static factory ────────────────────────────────────────

  static create(): ContactAggregationBuilder {
    return new ContactAggregationBuilder();
  }
}

export default ContactAggregationBuilder;