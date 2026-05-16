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

export const aiReportApi = createApi({
  reducerPath: "aiReportApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/ai-filter",
    credentials: "include",
  }),
  endpoints: (builder) => ({
    runAiQuery: builder.mutation<AiQueryResponse, { query: string; queryDisplay?: string; sessionId?: string }>({
      query: (body) => ({
        url: "/run",
        method: "POST",
        body,
      }),
    }),
    getAiHistory: builder.query<AiHistoryResponse, { limit?: number; sessionId?: string }>({
      query: ({ limit = 20, sessionId }) => ({
        url: `/history?limit=${limit}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ""}`,
        method: "GET",
      }),
    }),
  }),
});

export const { useRunAiQueryMutation, useGetAiHistoryQuery } = aiReportApi;
