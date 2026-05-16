'use client';
import React from 'react';
import { useSelector } from 'react-redux';
import UpdateContactForm from '@/components/form/contact-form/UpdateForm';
import Timeline from '@/components/ui/timeline/TimeLine';
import { useGetContactByIdQuery } from '@/app/redux/api/contactApi';
import { RootState } from '@/app/redux/rootReducer';
import ReadOnlyContactDisplay from '../form/contact-form/ReadOnlyContactDisplay';
import ShortSpinnerPrimary from '../ui/loaders/ShortSpinnerPrimary';

interface ContactByIdWrapperProps {
  contactId: string;
}

export default function ContactByIdWrapper({ contactId }: ContactByIdWrapperProps) {
  const { data, error, isLoading } = useGetContactByIdQuery(contactId);
  
  // Access user role from Redux store
  const userRole = useSelector((state: RootState) => state.user.user?.role);

  if (isLoading) return <div className='flex justify-center'><ShortSpinnerPrimary/></div>;
  if (error || !data?.success) return <div>Error loading contact</div>;

  const contact = data.data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-7 p-6">
      <div>
        {/* Conditionally render UpdateContactForm based on user role */}
        {userRole === 'admin' ? (
          <UpdateContactForm contact={contact} />
        ) : (
          <ReadOnlyContactDisplay contact={contact}/>
        )}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Activity Timeline
        </h2>
        <Timeline activities={contact.activities} />
      </div>
    </div>
  );
}