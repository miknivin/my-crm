import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Interface for the CalendarEvent (frontend-compatible)
export interface ICalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps: {
    calendar?: string;
  };
}

// Interface for a populated user (for employeeId and approverId)
interface IPopulatedUser {
  _id: string;
  name?: string;
  email: string;
}

// Interface for a LeaveRequest (frontend-compatible)
export interface ILeaveRequest {
  id: string;
  employeeId: string | IPopulatedUser;
  employeeName?: string;
  leaveType: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: string | IPopulatedUser;
  comments?: string;
  durationType: 'full-day' | 'half-day' | 'quarter-day';
  createdAt: string;
  updatedAt: string;
  rejectedReason:string;
}

// Interface for pagination query parameters
interface LeaveQueryParams {
  page: number;
  limit: number;
  search?: string;
}

// Interface for paginated response
interface PaginatedLeaveResponse {
  leaves: ILeaveRequest[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Interface for creating a leave request
interface CreateLeaveRequest {
  leaveType: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
  durationType: 'full-day' | 'half-day' | 'quarter-day';
}

// Interface for updating a leave request
interface UpdateLeaveRequest {
  id: string;
  leaveType?: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approverId?: string;
  rejectedReason?:string;
  durationType?: 'full-day' | 'half-day' | 'quarter-day';
}

// Define the API slice
export const calenderApi = createApi({
  reducerPath: "calenderApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/",
    prepareHeaders: (headers) => {
      headers.set('credentials', 'include');
      return headers;
    },
  }),
  tagTypes: ["Events", "Leaves"],
  endpoints: (builder) => ({
    getEvents: builder.query<ICalendarEvent[], void>({
      query: () => "calendar",
      providesTags: ["Events"],
    }),
    createEvent: builder.mutation<ICalendarEvent, Omit<ICalendarEvent, "id">>({
      query: (newEvent) => ({
        url: "calendar",
        method: "POST",
        body: newEvent,
      }),
      invalidatesTags: ["Events"],
    }),
    updateEvent: builder.mutation<void, ICalendarEvent>({
      query: (event) => ({
        url: "calendar",
        method: "PUT",
        body: event,
      }),
      invalidatesTags: ["Events"],
    }),
    deleteEvent: builder.mutation<void, { _id: string }>({
      query: ({ _id }) => ({
        url: "calendar",
        method: "DELETE",
        body: { _id },
      }),
      invalidatesTags: ["Events"],
    }),
    createLeave: builder.mutation<ILeaveRequest, CreateLeaveRequest>({
      query: (newLeave) => ({
        url: "leave",
        method: "POST",
        body: newLeave,
      }),
      invalidatesTags: ["Leaves"],
      transformResponse: (response: { data: ILeaveRequest & { _id: string } }) => ({
        ...response.data,
        id: response.data._id,
      }),
    }),
    getLeaves: builder.query<PaginatedLeaveResponse, LeaveQueryParams>({
      query: ({ page, limit, search }) => ({
        url: "leave",
        params: { page, limit, search },
      }),
      providesTags: ["Leaves"],
      transformResponse: (response: { data: { leaves: (ILeaveRequest & { _id: string })[]; page: number; limit: number; total: number; totalPages: number } }) => ({
        leaves: response.data.leaves.map(leave => ({
          ...leave,
          id: leave._id,
        })),
        page: response.data.page,
        limit: response.data.limit,
        total: response.data.total,
        totalPages: response.data.totalPages,
      }),
    }),
    updateLeave: builder.mutation<ILeaveRequest, UpdateLeaveRequest>({
      query: ({ id, ...updateData }) => ({
        url: `leave/${id}`,
        method: "PUT",
        body: updateData,
      }),
      invalidatesTags: ["Leaves"],
      transformResponse: (response: { data: ILeaveRequest & { _id: string } }) => ({
        ...response.data,
        id: response.data._id,
      }),
    }),
    getLeaveById: builder.query<ILeaveRequest, string>({
      query: (id) => `leave/${id}`,
      providesTags: ["Leaves"],
      transformResponse: (response: { data: ILeaveRequest & { _id: string } }) => ({
        ...response.data,
        id: response.data._id,
      }),
    }),
  }),
});

export const {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useCreateLeaveMutation,
  useGetLeavesQuery,
  useUpdateLeaveMutation,
  useGetLeaveByIdQuery,
} = calenderApi;