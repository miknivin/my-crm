"use client";
import { useGetAllPipelinesLeanQuery, useGetStagesByPipelineIdQuery } from "@/app/redux/api/pipelineApi";
import { useUpdateContactsPipelineMutation } from "@/app/redux/api/contactApi"; // Import the mutation
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/rootReducer";

interface AddToPipelineFormProps {
  onClose: () => void;
  selectedContacts: string[];
}

export default function AddToPipelineForm({ onClose, selectedContacts }: AddToPipelineFormProps) {
  const [formData, setFormData] = useState({
    pipeline: "",
    stage: "",
  });
  const [isPipelineDropdownOpen, setIsPipelineDropdownOpen] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const user = useSelector((state: RootState) => state.user.user);
  const userId = user?._id;
  // Fetch all pipelines
  const { data: pipelinesData, isLoading: isPipelinesLoading, error: pipelinesError } = useGetAllPipelinesLeanQuery();
  const pipelineOptions = pipelinesData?.data || [];

  // Fetch stages for the selected pipeline
  const { data: stagesData, isLoading: isStagesLoading, error: stagesError } = useGetStagesByPipelineIdQuery(formData.pipeline, {
    skip: !formData.pipeline, // Skip query if no pipeline is selected
  });
  const stageOptions = stagesData?.data || [];

  // Use the updateContactsPipeline mutation
  const [updateContactsPipeline, { isLoading: isUpdating }] = useUpdateContactsPipelineMutation();

  // Handle errors from API
  useEffect(() => {
    if (pipelinesError) {
      setError("Failed to load pipelines");
    } else if (stagesError) {
      setError("Failed to load stages");
    } else {
      setError(null);
    }
  }, [pipelinesError, stagesError]);

  const handlePipelineSelect = (pipelineId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setFormData((prev) => ({ pipeline: pipelineId, stage: "" })); // Reset stage when pipeline changes
    setIsPipelineDropdownOpen(false);
  };

  const handleStageSelect = (stageId: string) => {
    setFormData((prev) => ({ ...prev, stage: stageId }));
    setIsStageDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate required fields
    if (!formData.pipeline || !formData.stage) {
      setError("Please select both a pipeline and a stage");
      setIsLoading(false);
      return;
    }

    try {
      if(userId){
        await updateContactsPipeline({
          contactIds: selectedContacts,
          pipelineId: formData.pipeline,
          stageId: formData.stage,
          userId,
        }).unwrap();
      }
      toast.success("Contacts added to pipeline successfully");

      setFormData({ pipeline: "", stage: "" });
      setIsLoading(false);
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setError(error?.data?.message || "Failed to add contacts to pipeline");
      toast.error(error?.data?.message || "Failed to add contacts to pipeline");
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
        Add to Pipeline
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="pipeline"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Select Pipeline
          </label>
          <div className="relative">
            <button
              id="dropdownPipelineButton"
              type="button"
              onClick={() => setIsPipelineDropdownOpen(!isPipelineDropdownOpen)}
              className="w-full text-white bg-gray-700 hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center justify-between dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800"
              disabled={isPipelinesLoading}
            >
              {isPipelinesLoading ? (
                "Loading Pipelines..."
              ) : formData.pipeline ? (
                pipelineOptions.find((p) => p._id === formData.pipeline)?.name || "Select Pipeline"
              ) : (
                "Select Pipeline"
              )}
              <svg
                className="w-2.5 h-2.5 ms-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 10 6"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="m1 1 4 4 4-4"
                />
              </svg>
            </button>
            {isPipelineDropdownOpen && (
              <div
                id="dropdownPipeline"
                className="z-10 absolute mt-2 w-full bg-white divide-y divide-gray-100 rounded-lg shadow-sm dark:bg-gray-700 dark:divide-gray-600"
              >
                <ul
                  className="p-3 space-y-3 text-sm text-gray-700 dark:text-gray-200"
                  aria-labelledby="dropdownPipelineButton"
                >
                  {pipelineOptions.length > 0 ? (
                    pipelineOptions.map((option) => (
                      <li key={option._id}>
                        <div className="flex items-center">
                          <input
                            id={`pipeline-radio-${option._id}`}
                            type="radio"
                            value={option._id}
                            name="pipeline-radio"
                            checked={formData.pipeline === option._id}
                            onChange={() => handlePipelineSelect(option._id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                          />
                          <label
                            htmlFor={`pipeline-radio-${option._id}`}
                            className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                          >
                            {option.name}
                          </label>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">No pipelines available</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div>
          <label
            htmlFor="stage"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Select Stage
          </label>
          <div className="relative">
            <button
              id="dropdownStageButton"
              type="button"
              onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
              className="w-full text-white bg-gray-700 hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center justify-between dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800"
              disabled={isStagesLoading || !formData.pipeline}
            >
              {isStagesLoading ? (
                "Loading Stages..."
              ) : formData.stage ? (
                stageOptions.find((s) => s._id === formData.stage)?.name || "Select Stage"
              ) : (
                "Select Stage"
              )}
              <svg
                className="w-2.5 h-2.5 ms-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 10 6"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="m1 1 4 4 4-4"
                />
              </svg>
            </button>
            {isStageDropdownOpen && (
              <div
                id="dropdownStage"
                className="z-10 absolute mt-2 w-full bg-white divide-y divide-gray-100 rounded-lg shadow-sm dark:bg-gray-700 dark:divide-gray-600"
              >
                <ul
                  className="p-3 space-y-3 text-sm text-gray-700 dark:text-gray-200"
                  aria-labelledby="dropdownStageButton"
                >
                  {stageOptions.length > 0 ? (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    stageOptions.map((option:any) => (
                      <li key={option._id}>
                        <div className="flex items-center">
                          <input
                            id={`stage-radio-${option._id}`}
                            type="radio"
                            value={option._id}
                            name="stage-radio"
                            checked={formData.stage === option._id}
                            onChange={() => handleStageSelect(option._id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                          />
                          <label
                            htmlFor={`stage-radio-${option._id}`}
                            className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                          >
                            {option.name}
                          </label>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">No stages available</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || isUpdating || isPipelinesLoading || isStagesLoading}>
            {isLoading || isUpdating ? <ShortSpinnerDark /> : "Add to Pipeline"}
          </Button>
        </div>
      </form>
    </>
  );
}