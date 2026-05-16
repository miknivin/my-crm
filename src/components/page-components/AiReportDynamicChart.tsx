/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import React from "react";
import { ApexOptions } from "apexcharts";
import { AiChart } from "@/app/types/ai-report";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Props = {
  chart: AiChart;
};

export default function AiReportDynamicChart({ chart }: Props) {
  const options: ApexOptions =
    chart.type === "pie"
      ? {
          chart: { type: "pie", fontFamily: "Outfit, sans-serif" },
          labels: chart.labels || [],
          legend: { position: "bottom" },
          title: chart.title ? { text: chart.title } : undefined,
        }
      : {
          chart: { type: chart.type, fontFamily: "Outfit, sans-serif", toolbar: { show: false } },
          xaxis: {
            categories: chart.categories || [],
            labels: { style: { colors: "#6B7280" } },
          },
          dataLabels: { enabled: false },
          stroke: { curve: "smooth", width: 2 },
          
        };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <ReactApexChart
        options={options}
        series={chart.series as any}
        type={chart.type}
        height={280}
      />
    </div>
  );
}
