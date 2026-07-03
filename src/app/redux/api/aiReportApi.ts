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

type AiQueryResponse = Record<string, unknown>;

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
  endpoints: (builder) => ({
    runAiQuery: builder.mutation<AiQueryResponse, { query: string; queryDisplay?: string; sessionId?: string }>({
      query: (body) => ({
        url: "/run",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AiSessions"],
    }),
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
  useRunAiQueryMutation,
  useGetAiHistoryQuery,
  useLazyGetAiHistoryQuery,
  useGetAiSessionsQuery,
} = aiReportApi;
