import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

interface GenerateProposalItem {
  serviceId: string;
  quantity: number;
}

export interface GenerateProposalRequest {
  contactId: string;
  items: GenerateProposalItem[];
  proposalTitle?: string;
  preparedFor?: string;
  advanceAmount?: number;
}

export interface GenerateProposalResponse {
  blob: Blob;
  filename: string;
}

const extractFilenameFromDisposition = (contentDisposition?: string | null): string => {
  if (!contentDisposition) return "proposal.pdf";
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || "proposal.pdf";
};

export const proposalApi = createApi({
  reducerPath: "proposalApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
  }),
  endpoints: (builder) => ({
    generateProposal: builder.mutation<GenerateProposalResponse, GenerateProposalRequest>({
      query: (body) => ({
        url: "/proposals/generate",
        method: "POST",
        body,
        responseHandler: async (response) => ({
          blob: await response.blob(),
          filename: extractFilenameFromDisposition(response.headers.get("content-disposition")),
        }),
      }),
      
    }),
    generateProposalProduction: builder.mutation<GenerateProposalResponse, GenerateProposalRequest>({
      query: (body) => ({
        url: "/proposals/production-generate",
        method: "POST",
        body,
        responseHandler: async (response) => ({
          blob: await response.blob(),
          filename: extractFilenameFromDisposition(response.headers.get("content-disposition")),
        }),
      }),
      
    }),
  }),
});

export const { useGenerateProposalMutation, useGenerateProposalProductionMutation } = proposalApi;

