'use client';

import React from 'react';
import Badge from '../ui/badge/Badge';
import { useGetContactsQuery, ResponseContact } from '@/app/redux/api/contactApi';
import ShortSpinnerPrimary from '../ui/loaders/ShortSpinnerPrimary';
import EditIcon from '../ui/flowbiteIcons/EditIcon';
import Link from 'next/link';

const ContactTableTwo: React.FC = () => {
  const { data, error, isLoading } = useGetContactsQuery({ page: 1, limit: 10, keyword: '', filter: {} });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getErrorMessage = (error: any): string => {
    if (!error) return 'Unknown error';
    if ('status' in error) {
      return `Error ${error.status}: ${JSON.stringify(error.data) || 'Unknown error'}`;
    }
    return error.message || 'Unknown error';
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-4 px-5 py-3 flex justify-between item-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 text-start">New Contacts</h3>
        <Link
          href="/pipelines/682da76cb5aab2e983c88634"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        >
          See All
        </Link>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-5 py-3">
                Contact
              </th>
              <th scope="col" className="px-5 py-3">
                Phone number
              </th>
              <th scope="col" className="px-5 py-3">
                Tags
              </th>
              <th scope="col" className="px-5 py-3">
                Notes
              </th>
              <th scope="col" className="px-5 py-3">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={5} className="px-5 py-4 text-center">
                  <div className="w-full flex justify-center">
                    <ShortSpinnerPrimary />
                  </div>
                </td>
              </tr>
            )}
            {error && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={5} className="px-5 py-4 text-center text-red-500">
                  {getErrorMessage(error)}
                </td>
              </tr>
            )}
            {!isLoading && !error && data?.contacts?.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td colSpan={5} className="px-5 py-4 text-center">
                  No contacts found
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              data?.contacts?.map((contact: ResponseContact) => (
                <tr
                  key={contact._id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                >
                  <th
                    scope="row"
                    className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block font-medium text-gray-800 text-sm dark:text-white/90">
                          {contact.name}
                        </span>
                        <span className="block text-gray-500 text-xs dark:text-gray-400">
                          {contact.email}
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className="px-5 py-4">{contact.phone}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.length > 0 ? (
                        contact.tags.map((tag, index) => (
                          <Badge key={index} size="sm" color="info">
                            {tag.name}
                          </Badge>
                        ))
                      ) : (
                        <span>None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="max-w-36 line-clamp-3">
                      {contact.notes || 'No notes'}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap">
                      <Link
                        href={`contacts/${contact._id}`}
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-2.5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                      >
                        <EditIcon />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContactTableTwo;