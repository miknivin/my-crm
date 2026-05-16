"use client";
import { useUpdatePipelineMutation, useGetPipelineByIdQuery } from "@/app/redux/api/pipelineApi";
import Button from "@/components/ui/button/Button";
import ShortSpinnerDark from "@/components/ui/loaders/ShortSpinnerDark";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/rootReducer";
import { toast } from "react-toastify";
import StageList, { StageDrop } from "./StagesDnd";
import styles from "./AddPipelineForm.module.css";

// Define interfaces
interface StageInput {
  name: string;
  probability: number | "";
}

interface Stage extends StageInput {
  id: string; 
  order: number; 
  stage_id?: string; 
}

interface EditPipelineFormProps {
  pipelineId: string;
  onClose: () => void;
}

export default function EditPipelineForm({ pipelineId, onClose }: EditPipelineFormProps) {
  const { user } = useSelector((state: RootState) => state.user);
  const [formData, setFormData] = useState({
    name: "",
    notes: "",
    userId: user ? user._id : "",
    stages: [] as Stage[],
  });
  const [stageInput, setStageInput] = useState<StageInput>({ name: "", probability: "" });
  const [error, setError] = useState<string | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [updatePipeline, { isLoading: isUpdating }] = useUpdatePipelineMutation();
  const { data: pipelineData, isLoading: isFetching, error: fetchError } = useGetPipelineByIdQuery(pipelineId);

  // Prefill form with pipeline data
  useEffect(() => {
    if (pipelineData?.pipeline) {
      const { name, notes, stages } = pipelineData.pipeline;
      setFormData({
        name: name || "",
        notes: notes || "",
        userId: user ? user._id : "",
        stages: stages.map((stage, index) => ({
          id: stage._id, // Use backend _id for React DnD
          stage_id: stage._id, // Backend stage ID for updates
          name: stage.name,
          probability: stage.probability, // Convert to percentage
          order: stage.order || index + 1,
        })),
      });
    }
  }, [pipelineData, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStageInput((prev) => ({
      ...prev,
      [name]: name === "name" ? value : value === "" ? "" : Number(value),
    }));
  };

  const handleStageAdd = () => {
    const { name, probability } = stageInput;
    const trimmedName = name.trim();

    if (!trimmedName || probability === "") {
      setStageError("Stage name and probability are required.");
      return;
    }

    if (formData.stages.some((stage) => stage.name === trimmedName)) {
      setStageError(`Stage "${trimmedName}" already exists.`);
      return;
    }

    if (typeof probability !== "number" || probability < 0 || probability > 100) {
      setStageError("Probability must be between 0 and 100.");
      return;
    }

    const newStage: Stage = {
      id: Date.now().toString(), // Unique ID for React DnD
      name: trimmedName,
      probability,
      order: formData.stages.length + 1, // Initial order
    };

    setFormData((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage],
    }));
    setStageInput({ name: "", probability: "" });
    setStageError(null);
  };

  const handleStageRemove = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      stages: prev.stages
        .filter((stage) => stage.name !== name)
        .map((stage, idx) => ({ ...stage, order: idx + 1 })), // Reassign orders
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Pipeline name is required.");
      return;
    }

    try {
      const response = await updatePipeline({
        pipelineId,
        name: formData.name,
        notes: formData.notes || null,
        stages: formData.stages.map((stage) => ({
          stage_id: stage.stage_id, // Include stage_id for existing stages
          name: stage.name,
          order: stage.order,
          probability: typeof stage.probability === "number" ? stage.probability / 100 : Number(stage.probability) / 100, // Convert to 0-1
        })),
      }).unwrap();
      console.log("Pipeline updated:", response.pipeline);
      setFormData({
        name: "",
        notes: "",
        userId: formData.userId,
        stages: [],
      });
      setStageInput({ name: "", probability: "" });
      onClose();
      toast.success("Pipeline and stages updated successfully");
    } catch (err: unknown) {
      console.error("Error updating pipeline:", err);
      setError("Failed to update pipeline");
    }
  };

  if (isFetching) {
    return <ShortSpinnerDark />;
  }

  if (fetchError) {
    return <p className="text-red-500">Error loading pipeline data</p>;
  }

  return (
    <>
      <h2 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
        Edit Pipeline
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[85vh] overflow-y-auto">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Pipeline Name
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
            htmlFor="notes"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            rows={4}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Stages
          </label>
          <div
            className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus-within:border-brand-800"
            role="group"
            aria-label="Enter stages"
          >
            {formData.stages.filter((stage) => typeof stage.probability === "number").length > 0 && (
             <StageList
                stages={formData.stages as StageDrop[]} // Cast to StageDrop
                setStages={(updated: StageDrop[]) =>
                  setFormData((prev) => ({
                                      ...prev,
                                      stages: updated
                                        .map((stage, idx) => ({
                                          ...stage,
                                          order: idx + 1,
                                          probability: stage.probability !== undefined ? stage.probability : 0.5,
                                        })) // Reassign orders and ensure probability is present
                                        .sort((a, b) => a.order - b.order), // Sort after DnD
                                    }))
                }
                handleStageRemove={handleStageRemove}
              />
            )}
            <div className="space-y-2">
              <input
                type="text"
                name="name"
                value={stageInput.name}
                onChange={handleStageInputChange}
                placeholder="Stage name"
                className={`w-full outline-none text-sm text-gray-800 bg-transparent placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30 p-2 focus:bg-transparent ${styles.noAutofillBg} border border-gray-300 mb-2 dark:border-gray-700`}
                aria-label="Stage name"
              />
              <input
                type="number"
                name="probability"
                value={stageInput.probability}
                onChange={handleStageInputChange}
                placeholder="Probability (0-100)"
                min="0"
                max="100"
                className={`w-full outline-none text-sm text-gray-800 bg-transparent placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30 focus:bg-transparent p-2 rounded-md border ${styles.noAutofillBg} border-gray-300 mb-2 dark:border-gray-700`}
                aria-label="Stage probability"
              />
              <Button
                type="button"
                onClick={handleStageAdd}
                variant="primary"
                className="mt-2"
                disabled={!stageInput.name.trim() || stageInput.probability === ""}
              >
                Add Stage
              </Button>
            </div>
            {stageError && <p className="text-red-500 text-sm mt-1">{stageError}</p>}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isUpdating || isFetching}>
            {isUpdating ? <ShortSpinnerDark /> : "Update Pipeline"}
          </Button>
        </div>
      </form>
    </>
  );
}