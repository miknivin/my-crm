import { useActiveContact, useBoardActions, usePipelineStages } from "./board/PipelineBoardProvider";

export function usePipelineBoard() {
  return {
    stages: usePipelineStages(),
    activeContact: useActiveContact(),
    ...useBoardActions(),
  };
}
