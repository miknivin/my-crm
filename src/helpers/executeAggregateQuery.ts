/* eslint-disable @typescript-eslint/no-explicit-any */
import ContactAggregationBuilder from '@/app/classes/ContactAggregationBuilder';

/**
 * Execute a single "aggregate" step from AI query
 * @param step - AI query step of type "aggregate"
 * @param tenantId - ObjectId of current user
 * @returns Aggregated data array
 */
export async function executeAggregateQuery(step: any, tenantId?: any) {
  const builder = ContactAggregationBuilder.create();

  if (tenantId) {
    builder.match({ user: tenantId });
  }

  // ── enforce tenant isolation ────────────────────────────

  // ── apply AI aggregate actions ──────────────────────────
  if (Array.isArray(step.aggregateActions)) {
    for (const action of step.aggregateActions) {
      const { method, args } = action;

      // Normalize method calls to the builder
      if (typeof (builder as any)[method] === 'function') {
        (builder as any)[method](...(args || []));
      } else {
        console.warn(`Unknown aggregate method: ${method}`);
      }
    }
  }

  // ── Sorting, limiting, projecting if defined in step ───
  if (step.sort) {
    builder.sort(step.sort);
  }

  const hasGroup = step.aggregateActions?.some(
  (a: any) => a.method.toLowerCase().includes('group')
);

if (step.projection && !hasGroup) {
  builder.project(step.projection);
}

// if (step.limit && !hasGroup) {
//   builder.limit(step.limit);
// }


  // ── Execute pipeline ───────────────────────────────────
  const data = await builder.exec();
  return data;
}
