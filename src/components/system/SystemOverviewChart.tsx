"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function SystemOverviewChart() {
  const [chartData, setChartData] = useState({
    categories: [] as string[],
    qmsReports: [] as number[],
    operationsReports: [] as number[],
  });

  useEffect(() => {
    const loadData = () => {
      const qmsReports = [
        ...JSON.parse(localStorage.getItem("svr_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("qsc_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("ttf_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("qualityAuditReports") || "[]"),
        ...JSON.parse(localStorage.getItem("trainingAuditReports") || "[]"),
      ];

      const operationsReports = [
        ...JSON.parse(localStorage.getItem("operational_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("maintenance_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("incident_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("performance_reports") || "[]"),
      ];

      // Get last 12 months
      const monthlyData: { [key: string]: { qms: number; operations: number } } = {};
      const now = new Date();

      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = { qms: 0, operations: 0 };
      }

      qmsReports.forEach((report: any) => {
        const date = new Date(report.createdAt || report.submittedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[monthKey]) monthlyData[monthKey].qms++;
      });

      operationsReports.forEach((report: any) => {
        const date = new Date(report.createdAt || report.submittedAt || report.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[monthKey]) monthlyData[monthKey].operations++;
      });

      const months = Object.keys(monthlyData).sort();
      const categories = months.map(m => {
        const [year, month] = m.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      });

      setChartData({
        categories,
        qmsReports: months.map(m => monthlyData[m].qms),
        operationsReports: months.map(m => monthlyData[m].operations),
      });
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 350,
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ["#6366F1", "#10B981"],
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
    },
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 5,
    },
    xaxis: {
      categories: chartData.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Number of Reports" },
    },
    tooltip: {
      shared: true,
      intersect: false,
    },
  };

  const series = [
    { name: "QMS Reports", data: chartData.qmsReports },
    { name: "Operations Reports", data: chartData.operationsReports },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          System Activity Overview
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monthly reports across all modules (Last 12 months)
        </p>
      </div>
      <div className="p-6">
        <ReactApexChart options={options} series={series} type="area" height={350} />
      </div>
    </div>
  );
}
