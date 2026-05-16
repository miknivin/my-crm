/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { ResponseContact, useGetTasksQuery, useUpdateContactMutation, useUpdateContactStageMutation } from '@/app/redux/api/contactApi';
import { useGetStagesByPipelineIdQuery } from '@/app/redux/api/pipelineApi';
import { toast } from 'react-toastify';
import VeryShortSpinnerPrimary from '@/components/ui/loaders/veryShortSpinnerPrimary';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { Modal } from "@/components/ui/modal";
import TaskTabs from '@/components/pipeline/TaskTabs';
import { useModal } from '@/hooks/useModal';

interface UpdateContactFormProps {
  contact: ResponseContact;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  businessName?: string;
}

const UpdateContactForm: React.FC<UpdateContactFormProps> = ({ contact }) => {
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
  const [updateContactStage, { isLoading: isStageUpdating }] = useUpdateContactStageMutation();
  const { data: tasksData, isLoading: isTasksLoading, error: tasksError } = useGetTasksQuery({ contactId: contact._id });
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    businessName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const { isOpen: isNotesModalOpen, openModal: openNotesModal, closeModal: closeNotesModal } = useModal();
  const DEFAULT_PIPELINE_ID = process.env.NEXT_PUBLIC_DEFAULT_PIPELINE || '6858217887f5899a7e6fc6f1';
  const { data: stagesData, isLoading: isStagesLoading, error: stagesError } = useGetStagesByPipelineIdQuery(DEFAULT_PIPELINE_ID, {
    skip: !DEFAULT_PIPELINE_ID,
  });


  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        notes: contact.notes || '',
        businessName: contact.businessName || '',
      });
      const pipelineEntry = Array.isArray(contact.pipelinesActive) && contact.pipelinesActive.length > 0
        ? contact.pipelinesActive.find(entry => entry.pipeline_id?.toString() === DEFAULT_PIPELINE_ID)
        : null;
      setSelectedStage(pipelineEntry?.stage_id?.toString() || '');
    }
  }, [contact, DEFAULT_PIPELINE_ID]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStage(e.target.value);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      const payload = {
        id: contact._id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        businessName: formData.businessName,
        tags: contact.tags || [], // Preserve existing tags
      };

      // Update contact details first
      const contactResult = await updateContact(payload).unwrap();
      if (contactResult.success) {
        toast.success('Contact updated successfully');
      }

      // Check if stage has changed and update if necessary
      const pipelineEntry = Array.isArray(contact.pipelinesActive) && contact.pipelinesActive.length > 0
        ? contact.pipelinesActive.find(entry => entry.pipeline_id?.toString() === DEFAULT_PIPELINE_ID)
        : null;
      const currentStageId = pipelineEntry?.stage_id?.toString() || '';
      const stageChanged = selectedStage && selectedStage !== currentStageId;

      if (stageChanged) {
        const stageResult = await updateContactStage({
          contactId: contact._id,
          stageId: selectedStage,
        }).unwrap();
        if (stageResult.success) {
          toast.success('Contact stage updated successfully');
        }
      }
    } catch (error: any) {
      console.error('Error updating contact:', error);
      const errorMessage = error.data?.message || error.data?.error || 'Failed to update contact';
      const errorDetails = error?.data?.errors?.join(', ') || '';
      const finalMessage = errorMessage.includes('VersionError')
        ? 'Failed to update contact due to concurrent modification. Please try again.'
        : errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
      setError(finalMessage);
      toast.error(finalMessage);
      // Revert stage selection on error
      const pipelineEntry = Array.isArray(contact.pipelinesActive) && contact.pipelinesActive.length > 0
        ? contact.pipelinesActive.find(entry => entry.pipeline_id?.toString() === DEFAULT_PIPELINE_ID)
        : null;
      setSelectedStage(pipelineEntry?.stage_id?.toString() || '');
    }
  };

  return (
    <>    <Modal isOpen={isNotesModalOpen} onClose={closeNotesModal} className="max-w-[600px] p-6">
        <TaskTabs contact={contact} onClose={closeNotesModal} />
      </Modal>
    <div className="space-y-6 sticky top-1 md:top-20">
      
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Phone
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
          />
        </div>
        <div>
          <label
            htmlFor="businessName"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Business Name
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>
        <div>
          <label
            htmlFor="stage"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Stage
          </label>
          {isStagesLoading ? (
            <div className="flex justify-center">
              <VeryShortSpinnerPrimary />
            </div>
          ) : stagesError ? (
            <p className="text-red-500 text-sm">
              Failed to load stages: {(stagesError as any)?.data?.error || 'Unknown error'}
            </p>
          ) : stagesData?.data && stagesData.data.length > 0 ? (
            <div className="relative">
              <select
                value={selectedStage}
                onChange={handleStageChange}
                disabled={isStageUpdating || isUpdating}
                className="appearance-none bg-transparent border w-full border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:focus:ring-brand-800"
              >
                <option value="" disabled>Select a stage</option>
                {stagesData.data
                  .map((stage) => (
                    <option key={stage._id} value={stage._id}>
                      {stage.name}
                    </option>
                  ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No stages available for this pipeline.
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="notes"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            rows={2}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isUpdating || isStageUpdating}
          className="w-full h-11 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-brand-600 dark:hover:bg-brand-700 disabled:opacity-50"
        >
          {isUpdating || isStageUpdating ? 'Updating...' : 'Submit'}
        </button>
      </form>

      <div className="mt-6">
        <div className='flex justify-between mb-4 items-center'>
           <h2 className="text-lg font-semibold text-start text-gray-900 dark:text-white">
             Contact Tasks
           </h2>
            <button
              type="button"
              role="button"
              onClick={openNotesModal}
              className="inline-flex items-center justify-center font-medium gap-1 rounded-lg transition px-5 py-2.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:text-white"
            >
              Add +
            </button>
        </div>
       
        {isTasksLoading ? (
          <div className="flex justify-center">
            <VeryShortSpinnerPrimary />
          </div>
        ) : tasksError ? (
          <p className="text-red-500 text-sm">
            Failed to load contact tasks: {(tasksError as any)?.data?.message || 'Unknown error'}
          </p>
        ) : tasksData?.tasks && tasksData.tasks.length > 0 ? (
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={24}
            slidesPerView={1}
            breakpoints={{
              768: {
                slidesPerView: 2,
              },
            }}
            pagination={{ clickable: true }}
            className="mySwiper"
          >
            {tasksData.tasks.map((task) => (
              <SwiperSlide key={task._id}>
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {task.status.replace(/_/g, ' ')} · {task.priority} · {task.dueDate ? `${new Date(task.dueDate).toLocaleDateString()}${task.dueTime ? ` ${task.dueTime}` : ''}` : 'No due date'}
                  </p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tasks linked to this contact.
          </p>
        )}
      </div>
  
    </div>
    </>
  );
};

export default UpdateContactForm;
