"use client";

import React, { cloneElement, isValidElement } from "react";
import { createPortal } from "react-dom";
import { useTooltipPosition, type TooltipSide } from "@/hooks/useTooltipPosition";

interface AppTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: TooltipSide;
}

export default function AppTooltip({ content, children, side = "top" }: AppTooltipProps) {
  const { triggerRef, tooltipRef, visible, show, hide, style } = useTooltipPosition({ side });

  if (!isValidElement(children)) return children;

  const childProps = children.props as Record<string, unknown>;

  const trigger = cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      (childProps.onMouseEnter as ((e: React.MouseEvent) => void) | undefined)?.(e);
      show();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      (childProps.onMouseLeave as ((e: React.MouseEvent) => void) | undefined)?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      (childProps.onFocus as ((e: React.FocusEvent) => void) | undefined)?.(e);
      show();
    },
    onBlur: (e: React.FocusEvent) => {
      (childProps.onBlur as ((e: React.FocusEvent) => void) | undefined)?.(e);
      hide();
    },
  });

  return (
    <>
      {trigger}
      {visible && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              role="tooltip"
              className="pointer-events-none fixed z-999999 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              style={style}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
