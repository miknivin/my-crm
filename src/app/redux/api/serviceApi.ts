import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface IService {
  id: string;
  _id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  billingType: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  taxPercent?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceQueryParams {
  page: number;
  limit: number;
  search?: string;
}

interface PaginatedServiceResponse {
  services: IService[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CreateServiceRequest {
  name: string;
  description?: string;
  category?: string;
  price: number;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
  billingType?: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  taxPercent?: number;
  isActive?: boolean;
}

interface UpdateServiceRequest extends Partial<CreateServiceRequest> {
  id: string;
}

export const serviceApi = createApi({
  reducerPath: 'serviceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
  }),
  tagTypes: ['Services'],
  endpoints: (builder) => ({
    getServices: builder.query<PaginatedServiceResponse, ServiceQueryParams>({
      query: ({ page, limit, search = '' }) => ({
        url: '/services',
        params: { page, limit, search },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.services.map((service) => ({ type: 'Services' as const, id: service._id })),
              { type: 'Services', id: 'LIST' },
            ]
          : [{ type: 'Services', id: 'LIST' }],
      transformResponse: (response: {
        data: {
          services: (IService & { _id: string })[];
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }) => ({
        services: response.data.services.map((service) => ({
          ...service,
          id: service._id,
        })),
        page: response.data.page,
        limit: response.data.limit,
        total: response.data.total,
        totalPages: response.data.totalPages,
      }),
    }),
    getServiceById: builder.query<IService, string>({
      query: (id) => ({
        url: `/services/${id}`,
      }),
      providesTags: (result, error, id) => [{ type: 'Services', id }],
      transformResponse: (response: { data: IService & { _id: string } }) => ({
        ...response.data,
        id: response.data._id,
      }),
    }),
    createService: builder.mutation<IService, CreateServiceRequest>({
      query: (body) => ({
        url: '/services',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Services', id: 'LIST' }],
      transformResponse: (response: { data: IService & { _id: string } }) => ({
        ...response.data,
        id: response.data._id,
      }),
    }),
    updateService: builder.mutation<IService, UpdateServiceRequest>({
      query: ({ id, ...body }) => ({
        url: `/services/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Services', id },
        { type: 'Services', id: 'LIST' },
      ],
      transformResponse: (response: { data: IService & { _id: string } }) => ({
        ...response.data,
        id: response.data._id,
      }),
    }),
    deleteService: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/services/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Services', id },
        { type: 'Services', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetServicesQuery,
  useGetServiceByIdQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
} = serviceApi;

