'use client';

import store from '@/app/redux/store';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { ReactNode } from 'react';
import { useGetMeQuery } from '@/app/redux/api/userApi';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { IUser } from '@/app/models/User';
import FullLoadingScreen from '../ui/loaders/FullLoadingScreen';

interface ReduxProviderProps {
  children: ReactNode;
}

interface RootState {
  user: {
    isAuthenticated: boolean;
    user: IUser | null;
    loading: boolean;
  };
}

const AuthInitializer = () => {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isSuccess, isError } = useGetMeQuery();
const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
const loading = useSelector((state: RootState) => state.user.loading);

  useEffect(() => {
    //console.log("isAuthenticated:", isAuthenticated, "loading:", loading); // Debug log
    if (!loading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <FullLoadingScreen />;
  }

  return null;
};

export default function ReduxProvider({ children }: ReduxProviderProps) {
  return (
    <>
      <ToastContainer />
      <Provider store={store}>
        <AuthInitializer />
        {children}
      </Provider>
    </>
  );
}