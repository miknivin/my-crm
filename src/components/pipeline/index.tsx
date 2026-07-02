"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSearchParams } from "next/navigation";

import { useGetPipelineByIdQuery } from "@/app/redux/api/pipelineApi";
import Button from "@/components/ui/button/Button";
import PipelineOffCanvas from "@/components/ui/drawer/PipelineOffCanvas";
import FilterIcons from "@/components/ui/flowbiteIcons/Filter";
import ShortSpinnerPrimary from "@/components/ui/loaders/ShortSpinnerPrimary";
import { useModal } from "@/hooks/useModal";

import ContactDragOverlay from "./ContactDragOverlay";
import StageColumn from "./StageColumn";
import { PipelineBoardProvider, useActiveContact, useBoardActions, usePipelineStages } from "./board/PipelineBoardProvider";
import { useSelector } from "react-redux";
import { RootState } from "@/app/redux/rootReducer";
import { Modal } from "../ui/modal";
import AiReportModalShell from "../page-components/AiReportModalShell";
export type { BatchUpdate, Contact, Stage } from "./types";

// Hoisted so the options object reference is stable across renders —
// useSensor memoizes internally based on this identity.
const POINTER_SENSOR_OPTIONS = { activationConstraint: { distance: 5 } };

interface PipelineBoardContentProps {
  pipelineId: string;
  filters: {
    keyword?: string;
    source?: string;
    assignedTo?: string;
    startDate?: string;
    endDate?: string;
    activities?: string;
  };
}

function PipelineBoardContent({ pipelineId, filters }: PipelineBoardContentProps) {
  const sensors = useSensors(useSensor(PointerSensor, POINTER_SENSOR_OPTIONS));
  const stages = usePipelineStages();
  const activeContact = useActiveContact();
  const { handleDragStart, handleDragEnd } = useBoardActions();
  const boardRef = useRef<HTMLDivElement>(null);
  const scrollIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const updateScrollShadows = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    setCanScrollLeft(board.scrollLeft > 1);
    setCanScrollRight(board.scrollLeft + board.clientWidth < board.scrollWidth - 1);
  }, []);

  const handleBoardScroll = useCallback(() => {
    updateScrollShadows();
    setIsScrolling(true);
    if (scrollIdleTimeoutRef.current) clearTimeout(scrollIdleTimeoutRef.current);
    scrollIdleTimeoutRef.current = setTimeout(() => setIsScrolling(false), 150);
  }, [updateScrollShadows]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    updateScrollShadows();
    board.addEventListener("scroll", handleBoardScroll, { passive: true });
    window.addEventListener("resize", updateScrollShadows);
    return () => {
      board.removeEventListener("scroll", handleBoardScroll);
      window.removeEventListener("resize", updateScrollShadows);
      if (scrollIdleTimeoutRef.current) clearTimeout(scrollIdleTimeoutRef.current);
    };
    // Column count (not just contact count within a column) is what changes
    // the board's scrollWidth, so re-check whenever the stage list changes.
  }, [stages.length, updateScrollShadows, handleBoardScroll]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-6 min-h-[70vh] max-w-full">
          {stages.map((stage, idx) => (
            <StageColumn
              key={stage._id}
              stage={stage}
              pipelineId={pipelineId}
              filters={filters}
              isFinalThree={idx >= stages.length - 3}
            />
          ))}
        </div>

        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 w-20 bg-linear-to-r from-white via-white/80 via-30% to-transparent transition-opacity duration-200 dark:from-gray-900 dark:via-gray-900/80 ${
            canScrollLeft && !isScrolling ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-0 w-20 bg-linear-to-l from-white via-white/80 via-30% to-transparent transition-opacity duration-200 dark:from-gray-900 dark:via-gray-900/80 ${
            canScrollRight && !isScrolling ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <DragOverlay>{activeContact && <ContactDragOverlay contact={activeContact} />}</DragOverlay>
    </DndContext>
  );
}

export default function PipelineBody({ pipelineId }: { pipelineId: string }) {
  const { data: pipelineData, isLoading, error } = useGetPipelineByIdQuery(pipelineId, {
    skip: !pipelineId,
  });
const { user } = useSelector((state: RootState) => state.user);
const { isOpen: isAiReportModalOpen, openModal: openAiReportModal, closeModal: closeAiReportModal } = useModal();
  const searchParams = useSearchParams();
  const { isOpen, openModal, closeModal } = useModal();

  const filters = useMemo(
    () => ({
      keyword: searchParams.get("keyword") || undefined,
      source: searchParams.get("source") || undefined,
      assignedTo: searchParams.get("assignedTo") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      activities: searchParams.get("activities") || undefined,
    }),
    [searchParams]
  );

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const hasActiveFilters = useMemo(() => Object.values(filters).some(Boolean), [filters]);
  const canAccessAiReport = !!user && ["admin", "team_member"].includes(user.role);
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <ShortSpinnerPrimary />
      </div>
    );
  }

  if (error || !pipelineData?.pipeline) {
    return <div className="text-center py-12 text-red-600">Failed to load pipeline</div>;
  }

  return (
    <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 dark:border-gray-800 dark:bg-white/3">
      <div className="mx-auto w-full">
        <div className="flex justify-between items-center my-2">
          <h3 className="font-semibold text-gray-800 text-xl dark:text-white/90">{pipelineData.pipeline.name}</h3>

          <div className="flex gap-3 items-center">
            <Button size="sm" variant="outline" endIcon={<FilterIcons />} onClick={openModal}>
              <div className="flex items-center gap-1.5">
                {hasActiveFilters && <span className="w-3 h-3 bg-emerald-500 rounded-full" />}
                Filter
              </div>
            </Button>
             {canAccessAiReport && (
              <Button size="sm" variant="outline" onClick={() => openAiReportModal()}>
                AI Report
              </Button>
              )}
          </div>
        </div>

        <PipelineBoardProvider
          key={`${pipelineId}-${filtersKey}`}
          pipelineId={pipelineId}
          pipelineStages={pipelineData.pipeline.stages}
        >
          <PipelineBoardContent pipelineId={pipelineId} filters={filters} />
        </PipelineBoardProvider>
      </div>

      <Modal
        isOpen={isAiReportModalOpen}
        onClose={closeAiReportModal}
        isFullscreen
        className="bg-white p-6 dark:bg-gray-900 lg:p-10"
      >
        <AiReportModalShell onClose={closeAiReportModal} />
      </Modal>

      <PipelineOffCanvas isOpen={isOpen} onClose={closeModal} />
    </div>
  );
}
