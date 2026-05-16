'use client';

import { useSelector } from 'react-redux';

import AdminLayout from '@/app/(admin)/layout';
import { RootState } from '@/app/redux/rootReducer';
import AuthLayout from '@/app/(full-width-pages)/(auth)/layout';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
console.log(isAuthenticated);

  if (isAuthenticated === undefined) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <AdminLayout>{children}</AdminLayout> : <AuthLayout>{children}</AuthLayout>;
}