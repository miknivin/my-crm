import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

type AiHistoryItem = {
  id: string;
  sessionId?: string;
  queryText: string;
  uiType?: string;
  updatedAt?: string;
  response?: Record<string, unknown>;
  toolRequest?: Record<string, unknown>;
};

type AiHistoryResponse = {
  success: boolean;
  items: AiHistoryItem[];
};

type AiSessionListItem = {
  sessionId: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
};

type AiSessionsResponse = {
  success: boolean;
  sessions: AiSessionListItem[];
};

export const aiReportApi = createApi({
  reducerPath: "aiReportApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/ai-filter",
    credentials: "include",
  }),
  tagTypes: ["AiSessions"],
  // NOTE: the run call streams SSE, which RTK Query can't consume — it
  // lives in src/helpers/aiReportStream.ts; on completion the caller
  // dispatches aiReportApi.util.invalidateTags(["AiSessions"]).
  endpoints: (builder) => ({
    getAiHistory: builder.query<AiHistoryResponse, { limit?: number; sessionId?: string; sort?: "asc" | "desc" }>({
      query: ({ limit = 20, sessionId, sort }) => ({
        url: `/history?limit=${limit}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ""}${sort ? `&sort=${sort}` : ""}`,
        method: "GET",
      }),
    }),
    getAiSessions: builder.query<AiSessionsResponse, void>({
      query: () => ({
        url: "/sessions",
        method: "GET",
      }),
      providesTags: ["AiSessions"],
    }),
  }),
});

export const {
  useGetAiHistoryQuery,
  useLazyGetAiHistoryQuery,
  useGetAiSessionsQuery,
} = aiReportApi;
