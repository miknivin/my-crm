import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface ICompanySettings {
  companyName: string;
  logo?: { public_id: string; url: string };
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    upiId?: string;
  };
  invoicePrefix: string;
  invoiceNotes?: string;
}

type UpdateCompanySettingsRequest = Partial<ICompanySettings>;

export const settingsApi = createApi({
  reducerPath: "settingsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/settings",
    credentials: "include",
  }),
  tagTypes: ["CompanySettings"],
  endpoints: (builder) => ({
    getCompanySettings: builder.query<ICompanySettings | null, void>({
      query: () => "/company",
      transformResponse: (response: { data: ICompanySettings | null }) => response.data,
      providesTags: ["CompanySettings"],
    }),
    updateCompanySettings: builder.mutation<ICompanySettings, UpdateCompanySettingsRequest>({
      query: (body) => ({
        url: "/company",
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: ICompanySettings }) => response.data,
      invalidatesTags: ["CompanySettings"],
    }),
  }),
});

export const { useGetCompanySettingsQuery, useUpdateCompanySettingsMutation } = settingsApi;
