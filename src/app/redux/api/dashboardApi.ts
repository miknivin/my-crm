import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface MonthlyConversionRate {
  year: number;
  month: string; // e.g., "January", "February"
  totalContacts: number;
  closedContacts: number;
  conversionRate: string; // Ratio as a string with 2 decimal places
}

interface DashboardResponse {
  success: boolean;
  totalContacts: number;
  totalClosedContacts: number;
  currentMonthClosedContacts: number;
  lastMonthClosedContacts: number;
  monthlyConversionRates: MonthlyConversionRate[];
}

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api', 
    credentials: 'include', 
  }),
  endpoints: (builder) => ({
    getDashboardData: builder.query<DashboardResponse, void>({
      query: () => ({
        url: '/dashboard',
        method: 'GET',
      }),
    }),
  }),
});

// Export hooks for usage in functional components
export const { useGetDashboardDataQuery } = dashboardApi;
