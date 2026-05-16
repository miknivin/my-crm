"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import React from "react";

interface AppTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}

export default function AppTooltip({ content, children, side = "top" }: AppTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={6}
            className="z-999999 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {content}
            <Tooltip.Arrow className="fill-white dark:fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
