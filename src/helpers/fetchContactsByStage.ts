import axios from "axios";

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Tag {
  user: string;
  name: string;
}

interface AssignedTo {
  user: User;
  time: string;
}

interface Contact {
  assignedTo?: AssignedTo[];
  _id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  businessName?: string;
  source?: string;
  user?: { name: string; email: string };
  tags: Tag[];
  pipelinesActive: Array<{ pipeline_id: string; stage_id: string; order: number }>;
  createdAt: Date;
  updatedAt: Date;
  probability?: number;
}

// Updated response interface to match the new backend response
export interface GetContactsResponse {
  contacts: Contact[];
  total: number;          // ← NEW: total matching documents
  page: number;           // ← NEW
  limit: number;          // ← NEW
}

interface FetchContactsByStageParams {
  pipelineId: string;
  stageId: string;
  keyword?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string;
  activities?: { value: string; isNot: boolean }[];
  page?: number;          // ← NEW: optional pagination
  limit?: number;         // ← NEW: optional pagination (default 10 on backend)
}

/**
 * Fetches paginated contacts for a specific pipeline stage with filters
 * 
 * @param params - Query parameters including pagination
 * @returns Promise with contacts array + pagination metadata
 */
export async function fetchContactsByStage({
  pipelineId,
  stageId,
  keyword,
  source,
  startDate,
  endDate,
  assignedTo,
  activities,
  page = 1,               // default to page 1
  limit = 10,             // default to match backend
}: FetchContactsByStageParams): Promise<GetContactsResponse> {
  try {
    const params: Record<string, string> = {
      pipelineId,
      stageId,
      page: page.toString(),
      limit: limit.toString(),
    };

    // Add optional filters only if they exist
    if (keyword) params.keyword = keyword;
    if (source) params.source = source;
    if (assignedTo) params.assignedTo = assignedTo;

    // Dates - only add if valid
    if (startDate && !isNaN(Date.parse(startDate))) {
      params.startDate = startDate;
    }
    if (endDate && !isNaN(Date.parse(endDate))) {
      params.endDate = endDate;
    }

    // Activities filter - serialize as JSON string
    if (activities && activities.length > 0) {
      params.activities = JSON.stringify(activities);
    }

    const response = await axios.get("/api/contacts/by-stage", {
      params,
      withCredentials: true,
    });

    return response.data as GetContactsResponse;
  } catch (error: unknown) {
    console.error("Error fetching contacts by stage:", error);
    // You can throw a custom error or return fallback - depending on your error handling strategy
    throw new Error("Failed to fetch contacts by stage");
  }
}