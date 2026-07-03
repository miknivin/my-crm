"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export type TooltipSide = "top" | "right" | "bottom" | "left";

interface UseTooltipPositionOptions {
  side?: TooltipSide;
  gap?: number;
  viewportPadding?: number;
}

const TRANSFORM_BY_SIDE: Record<TooltipSide, string> = {
  top: "translate(-50%, -100%)",
  bottom: "translate(-50%, 0)",
  left: "translate(-100%, -50%)",
  right: "translate(0, -50%)",
};

export function useTooltipPosition({
  side = "top",
  gap = 6,
  viewportPadding = 8,
}: UseTooltipPositionOptions = {}) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  // Runs synchronously after the tooltip mounts (so its real size is known)
  // but before the browser paints, so there's no visible flash at (0,0).
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tooltipWidth = tooltipRect?.width ?? 0;
    const tooltipHeight = tooltipRect?.height ?? 0;

    let placedSide = side;
    if (placedSide === "top" && triggerRect.top - tooltipHeight - gap < 0) {
      placedSide = "bottom";
    } else if (
      placedSide === "bottom" &&
      triggerRect.bottom + tooltipHeight + gap > window.innerHeight
    ) {
      placedSide = "top";
    }

    let top: number;
    let left: number;

    if (placedSide === "top" || placedSide === "bottom") {
      top = placedSide === "top" ? triggerRect.top - gap : triggerRect.bottom + gap;
      left = triggerRect.left + triggerRect.width / 2;
      const minLeft = viewportPadding + tooltipWidth / 2;
      const maxLeft = window.innerWidth - viewportPadding - tooltipWidth / 2;
      left = Math.min(Math.max(left, minLeft), maxLeft);
    } else {
      left = placedSide === "left" ? triggerRect.left - gap : triggerRect.right + gap;
      top = triggerRect.top + triggerRect.height / 2;
    }

    setStyle({
      position: "fixed",
      top,
      left,
      transform: TRANSFORM_BY_SIDE[placedSide],
    });
  }, [side, gap, viewportPadding]);

  useLayoutEffect(() => {
    if (visible) reposition();
  }, [visible, reposition]);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  return { triggerRef, tooltipRef, visible, show, hide, style };
}
