/* eslint-disable @typescript-eslint/no-explicit-any */
import MongoFilterBuilder from '@/app/classes/MongoFilterBuilder';
import { executeFilterActions } from '@/helpers/executeFilterActions';
import mongoose, {  SortOrder } from 'mongoose';

/**
 * Execute a single "find" step
 * @param ModelClass - Mongoose model
 * @param step - AI query step of type "find"
 * @param tenantId - ObjectId of current user for tenant isolation
 * @returns Mongoose documents array
 */
export async function executeFindQuery(
  ModelClass: mongoose.Model<any>,
  step: any,
  tenantId: any
) {
  const builder = MongoFilterBuilder.create();

  // enforce tenant isolation
  builder.eq('user', tenantId);

  // apply AI filter actions
  executeFilterActions(builder, step.filterActions);

  const filter = builder.build();
  const projection = step.projection || {};
  const sort = step.sort || {};
  // const limit = step.limit || 20;
  const populate = step.populate || [];

  let query = ModelClass.find(filter, projection);

  if (Object.keys(sort).length) {
    query = query.sort(sort as Record<string, SortOrder>);
  }

  // if (limit) {
  //   query = query.limit(limit);
  // }

  if (populate.length) {
    query.populate(populate);
  }

  const data = await query.exec();
  return data;
}