import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type InvoiceCurrency = "INR" | "USD" | "EUR" | "GBP";
export type InvoiceStatus = "draft" | "sent" | "paid" | "partially_paid" | "cancelled";

export interface IInvoiceItem {
  serviceId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  amount: number;
  taxAmount: number;
  total: number;
}

export interface IInvoice {
  id: string;
  _id: string;
  invoiceNumber: string;
  contactId: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  items: IInvoiceItem[];
  currency: InvoiceCurrency;
  subtotal: number;
  taxTotal: number;
  discount?: { type: "flat" | "percent"; value: number; amount: number };
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentTerms?: string;
  notes?: string;
  contactSnapshot: { name: string; email?: string; phone?: string; businessName?: string };
  createdAt: string;
  updatedAt: string;
}

interface InvoiceQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

interface PaginatedInvoiceResponse {
  invoices: IInvoice[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateInvoiceRequest {
  contactId: string;
  serviceItems?: Array<{ serviceId: string; quantity: number; taxPercent?: number }>;
  customItems?: Array<{ name: string; description?: string; quantity: number; unitPrice: number; taxPercent?: number }>;
  dueDate: string;
  issueDate?: string;
  paymentTerms?: string;
  notes?: string;
  discount?: { type: "flat" | "percent"; value: number };
}

interface UpdateInvoiceRequest {
  id: string;
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
  status?: "sent" | "cancelled";
  amountPaid?: number;
}

export interface GenerateInvoicePdfResponse {
  blob: Blob;
  filename: string;
}

const extractFilenameFromDisposition = (contentDisposition?: string | null): string => {
  if (!contentDisposition) return "invoice.pdf";
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || "invoice.pdf";
};

const withId = (invoice: IInvoice & { _id: string }) => ({ ...invoice, id: invoice._id });

export const invoiceApi = createApi({
  reducerPath: "invoiceApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/invoices",
    credentials: "include",
  }),
  tagTypes: ["Invoices"],
  endpoints: (builder) => ({
    getInvoices: builder.query<PaginatedInvoiceResponse, InvoiceQueryParams>({
      query: ({ page, limit, search = "", status = "" }) => ({
        url: "",
        params: { page, limit, search, status },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.invoices.map((invoice) => ({ type: "Invoices" as const, id: invoice._id })),
              { type: "Invoices", id: "LIST" },
            ]
          : [{ type: "Invoices", id: "LIST" }],
      transformResponse: (response: { data: PaginatedInvoiceResponse & { invoices: (IInvoice & { _id: string })[] } }) => ({
        ...response.data,
        invoices: response.data.invoices.map(withId),
      }),
    }),
    getInvoiceById: builder.query<IInvoice, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: "Invoices", id }],
      transformResponse: (response: { data: IInvoice & { _id: string } }) => withId(response.data),
    }),
    createInvoice: builder.mutation<IInvoice, CreateInvoiceRequest>({
      query: (body) => ({ url: "", method: "POST", body }),
      invalidatesTags: [{ type: "Invoices", id: "LIST" }],
      transformResponse: (response: { data: IInvoice & { _id: string } }) => withId(response.data),
    }),
    updateInvoice: builder.mutation<IInvoice, UpdateInvoiceRequest>({
      query: ({ id, ...body }) => ({ url: `/${id}`, method: "PUT", body }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Invoices", id },
        { type: "Invoices", id: "LIST" },
      ],
      transformResponse: (response: { data: IInvoice & { _id: string } }) => withId(response.data),
    }),
    deleteInvoice: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, id) => [
        { type: "Invoices", id },
        { type: "Invoices", id: "LIST" },
      ],
    }),
    generateInvoicePdf: builder.mutation<GenerateInvoicePdfResponse, string>({
      query: (id) => ({
        url: `/${id}/pdf`,
        responseHandler: async (response) => ({
          blob: await response.blob(),
          filename: extractFilenameFromDisposition(response.headers.get("content-disposition")),
        }),
      }),
    }),
    generateInvoicePdfProduction: builder.mutation<GenerateInvoicePdfResponse, string>({
      query: (id) => ({
        url: `/${id}/pdf/production`,
        responseHandler: async (response) => ({
          blob: await response.blob(),
          filename: extractFilenameFromDisposition(response.headers.get("content-disposition")),
        }),
      }),
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceByIdQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useGenerateInvoicePdfMutation,
  useGenerateInvoicePdfProductionMutation,
} = invoiceApi;
