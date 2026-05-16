import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { setIsAuthenticated, setLoading, setUser } from "../features/authSlice";
import { IUser } from '@/app/models/User';

interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  address?: string;
}

interface UploadAvatarRequest {
  avatar: FormData; 
}

interface UpdatePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

interface ResetPasswordRequest {
  password: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: "user" | "admin" | "super_admin";
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  user?: IUser;
}

interface AdminUsersResponse {
  success: boolean;
  users: IUser[];
  page: number;
  totalPages: number;
  total: number;
}

interface CreateUserRequest {
  name?: string;
  email: string;
  password?: string;
  phone?:string;
  signupMethod?: 'OTP' | 'Email/Password' | 'OAuth';
  avatar?: {
    public_id: string;
    url: string;
  };
}

type UserTag = "User" | "AdminUsers" | "AdminUser" | "TeamMembers";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `/api`,
    credentials: "include",
  }),
   tagTypes: ["User", "AdminUsers", "AdminUser", "TeamMembers"] as UserTag[],
  endpoints: (builder) => ({
    getMe: builder.query<IUser, void>({
      query: () => "auth/me",
      transformResponse: (result: ApiResponse<IUser>) => result.user!,
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data));
          dispatch(setIsAuthenticated(true));
          dispatch(setLoading(false));
        } catch (error) {
          dispatch(setLoading(false));
          console.error("GetMe error:", error);
        }
      },
      providesTags: ["User"],
    }),
    updateProfile: builder.mutation<ApiResponse<IUser>, UpdateProfileRequest>({
      query: (body) => ({
        url: "/me/update",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    uploadAvatar: builder.mutation<ApiResponse<IUser>, UploadAvatarRequest>({
      query: (body) => ({
        url: "/me/upload_avatar",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    updatePassword: builder.mutation<ApiResponse<void>, UpdatePasswordRequest>({
      query: (body) => ({
        url: "/password/update",
        method: "PUT",
        body,
      }),
    }),
    resetPassword: builder.mutation<
      ApiResponse<void>,
      { token: string; body: ResetPasswordRequest }
    >({
      query: ({ token, body }) => ({
        url: `/password/reset/${token}`,
        method: "PUT",
        body,
      }),
    }),
    forgotPassword: builder.mutation<ApiResponse<void>, ForgotPasswordRequest>({
      query: (body) => ({
        url: "/password/forgot",
        method: "POST",
        body,
      }),
    }),
    getAdminUsers: builder.query<AdminUsersResponse, void>({
      query: () => "/admin/users",
      providesTags: ["AdminUsers"],
    }),
    getUserDetails: builder.query<ApiResponse<IUser>, string>({
      query: (id) => `/admin/users/${id}`,
      providesTags: ["AdminUser"],
    }),
    updateUser: builder.mutation<
      ApiResponse<IUser>,
      { id: string; body: UpdateUserRequest }
    >({
      query: ({ id, body }) => ({
        url: `/admin/users/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["AdminUsers"],
    }),
    deleteUser: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/admin/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AdminUsers"],
    }),
    addTeamMember: builder.mutation<ApiResponse<IUser>, CreateUserRequest>({
      query: (body) => ({
        url: "/users/team-member",
        method: "POST",
        body,
      }),
      transformResponse: (result: ApiResponse<IUser>) => result,
      invalidatesTags: ["AdminUsers","TeamMembers"],
    }),
    getTeamMembers: builder.query<AdminUsersResponse, { page?: number; limit?: number; search?: string }>({
      query: ({ page = 1, limit = 10, search = '' }) => ({
        url: "/users/team-member",
        params: { page, limit, search },
      }),
      providesTags: ["TeamMembers"],
    }),
  }),
});


export const {
  useGetMeQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useUpdatePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetAdminUsersQuery,
  useGetUserDetailsQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useAddTeamMemberMutation,
  useGetTeamMembersQuery
} = userApi;
