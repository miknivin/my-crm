/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Handle connection errors
redisClient.on('error', (err) => console.error('Redis Client Error:', err));

// Connect to Redis (only once, on module load)
redisClient.connect().catch((err) => console.error('Redis Connection Failed:', err));

// Cache a contact by ID
export async function cacheContact(contactId: string, contact: any): Promise<void> {
  try {
    const score = parseInt(contactId.slice(-8), 16); // Last 8 chars of ObjectId as score
    await Promise.all([
      redisClient.set(`contact:${contactId}`, JSON.stringify(contact), {
        EX: 432000, // Cache for 5 days
      }),
      redisClient.sAdd("contacts:set", contactId),
      redisClient.zAdd("contacts:sorted", { score, value: contactId }),
    ]);
  } catch (error) {
    console.error(`Failed to cache contact ${contactId}:`, error);
  }
}

// Retrieve a contact by ID from Redis
export async function getCachedContact(contactId: string): Promise<any | null> {
  try {
    const data = await redisClient.get(`contact:${contactId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Failed to retrieve cached contact ${contactId}:`, error);
    return null;
  }
}

// Batch retrieve contacts from Redis
export async function getCachedContactsBatch(contactIds: string[]): Promise<(any | null)[]> {
  try {
    const keys = contactIds.map(id => `contact:${id}`);
    const results = await redisClient.mGet(keys);
    return results.map(data => (data ? JSON.parse(data) : null));
  } catch (error) {
    console.error('Failed to retrieve cached contacts batch:', error);
    return contactIds.map(() => null);
  }
}

// Invalidate a contact cache
export async function invalidateContactCache(contactId: string): Promise<void> {
  try {
    await Promise.all([
      redisClient.del(`contact:${contactId}`),
      redisClient.sRem("contacts:set", contactId),
      redisClient.zRem("contacts:sorted", contactId),
    ]);
  } catch (error) {
    console.error(`Failed to invalidate cache for contact ${contactId}:`, error);
  }
}

// Cache a pipeline by ID
export async function cachePipeline(pipelineId: string, pipeline: any): Promise<void> {
  try {
    await redisClient.set(`pipeline:${pipelineId}`, JSON.stringify(pipeline), {
      EX: 432000, // Cache for 5 days
    });
  } catch (error) {
    console.error(`Failed to cache pipeline ${pipelineId}:`, error);
  }
}


export async function getCachedPipeline(pipelineId: string): Promise<any | null> {
  try {
    const data = await redisClient.get(`pipeline:${pipelineId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Failed to retrieve cached pipeline ${pipelineId}:`, error);
    return null;
  }
}


export async function cacheStage(stageId: string, stage: any): Promise<void> {
  try {
    await redisClient.set(`stage:${stageId}`, JSON.stringify(stage), {
      EX: 432000, 
    });
  } catch (error) {
    console.error(`Failed to cache stage ${stageId}:`, error);
  }
}

// Retrieve a stage by ID from Redis
export async function getCachedStage(stageId: string): Promise<any | null> {
  try {
    const data = await redisClient.get(`stage:${stageId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Failed to retrieve cached stage ${stageId}:`, error);
    return null;
  }
}

export default redisClient;