"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function ModulePerformanceChart() {
  const [chartData, setChartData] = useState({
    categories: [] as string[],
    avgScores: [] as number[],
    completionRates: [] as number[],
  });

  useEffect(() => {
    const loadData = () => {
      const modules = [
        { name: "SVR", key: "svr_reports" },
        { name: "QSC", key: "qsc_reports" },
        { name: "TTF", key: "ttf_reports" },
        { name: "Quality Audit", key: "qualityAuditReports" },
        { name: "Training Audit", key: "trainingAuditReports" },
        { name: "Operations", key: "operational_reports" },
        { name: "Maintenance", key: "maintenance_reports" },
      ];

      const categories: string[] = [];
      const avgScores: number[] = [];
      const completionRates: number[] = [];

      modules.forEach(module => {
        const reports = JSON.parse(localStorage.getItem(module.key) || "[]");
        if (reports.length > 0) {
          categories.push(module.name);

          // Calculate average score
          const scores = reports
            .map((r: any) => r.score?.percentage || parseInt(r.score) || 0)
            .filter((s: number) => s > 0);
          const avgScore = scores.length > 0 
            ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
            : 0;
          avgScores.push(avgScore);

          // Calculate completion rate
          const completed = reports.filter((r: any) => 
            r.status === "completed" || r.systemApproval?.approved
          ).length;
          const completionRate = Math.round((completed / reports.length) * 100);
          completionRates.push(completionRate);
        }
      });

      setChartData({ categories, avgScores, completionRates });
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: 350,
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 8,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    colors: ["#6366F1", "#10B981"],
    xaxis: {
      categories: chartData.categories,
    },
    yaxis: {
      title: { text: "Percentage (%)" },
      max: 100,
    },
    fill: { opacity: 1 },
    legend: {
      position: "top",
      horizontalAlign: "right",
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val}%`,
      },
    },
  };

  const series = [
    { name: "Avg Score", data: chartData.avgScores },
    { name: "Completion Rate", data: chartData.completionRates },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Module Performance Analysis
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Average scores and completion rates by module
        </p>
      </div>
      <div className="p-6">
        <ReactApexChart options={options} series={series} type="bar" height={350} />
      </div>
    </div>
  );
}
