import React, { memo, forwardRef, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
// import ShuffleIcon from "../ui/flowbiteIcons/Shuffle";

interface Stage {
  _id: string;
  name: string;
  order: number;
  probability: number;
}

interface SortableStageProps {
  stage: Stage;
  count: number;
  isFinalThree: boolean;
  children?: React.ReactNode;   // ← added so you can pass contacts list
}

function SortableStageComponent(
  { stage, count = 0, isFinalThree, children }: SortableStageProps,
  forwardedRef: React.ForwardedRef<HTMLDivElement>
) {
  const { attributes, setNodeRef, transform, transition } = useSortable({
    id: `stage-${stage._id}`,
  });

  // The scrollable column div doubles as dnd-kit's sortable node and, when
  // forwarded, as the scroll container a virtualizer needs to measure against.
  // Memoized so the ref identity is stable across renders — an unstable ref
  // callback makes React detach/reattach it on every render, which was
  // disrupting the virtualizer's scroll tracking.
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [setNodeRef, forwardedRef]
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: transform ? 0.8 : 1,
  };

  const showShuffleButton = ["not connected", "not interested", "response await"].some((keyword) =>
    stage.name.toLowerCase().includes(keyword)
  );

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      className="pipeline-stage-scrollbar mb-4 max-h-[85vh] min-w-56 overflow-y-auto rounded border border-gray-200 top-0 hover:shadow-md dark:border-gray-700"
      role="listitem"
      aria-label={`Stage: ${stage.name}`}
    >
      <div className={`flex sticky justify-center items-center flex-col mb-2 rounded border border-gray-200 p-2.5 dark:border-gray-700 hover:shadow-md top-0 bg-white ${isFinalThree ? "text-white dark:text-white bg-success-500 dark:bg-success-600"  : "text-gray-800 dark:text-white/90 bg-white dark:bg-gray-800"}`}>
        <h4 className={`font-medium text-sm ${isFinalThree ? "text-white dark:text-white" : "text-gray-800 dark:text-white/90"}`}>
          {stage.name}
        </h4>
        <p className="font-light text-xs text-white dark:text-white">{count} contacts</p>

        {showShuffleButton && (
          <div>
            {/* <button
              type="button"
              className="p-2 rounded-full absolute top-[-5px] right-0 text-xs font-medium text-center inline-flex items-center text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              <ShuffleIcon />
            </button> */}
          </div>
        )}
      </div>

      {/* Contacts go here – this is where children are rendered */}
      <div className="mt-3">
        {children}
      </div>
    </div>
  );
}

const SortableStage = forwardRef(SortableStageComponent);

export default memo(SortableStage);
