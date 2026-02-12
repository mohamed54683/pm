"use client";
import React, { useState, useEffect } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@/icons";

export default function SystemMetrics() {
  const [metrics, setMetrics] = useState({
    totalReports: 0,
    activeUsers: 0,
    systemHealth: 0,
    avgComplianceScore: 0,
    completedToday: 0,
    pendingActions: 0,
    criticalAlerts: 0,
    systemUptime: "99.9%",
    reportGrowth: 0,
    complianceTrend: 0,
    efficiencyScore: 0,
  });

  useEffect(() => {
    const loadMetrics = () => {
      // Load all system data
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

      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const allReports = [...qmsReports, ...operationsReports].filter(r => r && (r.createdAt || r.submittedAt || r.date));

      // Calculate today's completed reports
      const today = new Date();
      const completedToday = allReports.filter(r => {
        const reportDate = new Date(r.createdAt || r.submittedAt);
        return reportDate.toDateString() === today.toDateString() && 
               (r.status === "completed" || r.systemApproval?.approved);
      }).length;

      // Calculate average compliance score
      const scores: number[] = [];
      [...qmsReports, ...operationsReports].forEach((report: any) => {
        const score = report.score?.percentage || parseInt(report.score) || 0;
        if (score > 0) scores.push(score);
      });
      const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      // Calculate pending actions
      const pending = allReports.filter((r: any) => 
        r.status === "pending" || r.status === "in-progress"
      ).length;

      // Calculate critical alerts (low scores)
      const critical = scores.filter(s => s < 70).length;

      // Calculate system health (based on compliance and completion rate)
      const completedReports = allReports.filter((r: any) => 
        r.status === "completed" || r.systemApproval?.approved
      ).length;
      const completionRate = allReports.length > 0 
        ? (completedReports / allReports.length) * 100 
        : 100;
      const systemHealth = Math.round((avgScore * 0.6 + completionRate * 0.4));

      // Calculate growth
      const thisMonth = allReports.filter(r => {
        const date = new Date(r.createdAt || r.submittedAt);
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      });
      const lastMonth = allReports.filter(r => {
        const date = new Date(r.createdAt || r.submittedAt);
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1);
        return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
      });
      const growth = lastMonth.length > 0 
        ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100)
        : 0;

      // Calculate compliance trend
      const recentScores = scores.slice(-10);
      const olderScores = scores.slice(-20, -10);
      const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : avgScore;
      const olderAvg = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : avgScore;
      const complianceTrend = Math.round(((recentAvg - olderAvg) / (olderAvg || 1)) * 100);

      // Efficiency score (completion rate + avg score)
      const efficiencyScore = Math.round((completionRate + avgScore) / 2);

      setMetrics({
        totalReports: allReports.length,
        activeUsers: users.length,
        systemHealth: systemHealth,
        avgComplianceScore: avgScore,
        completedToday: completedToday,
        pendingActions: pending,
        criticalAlerts: critical,
        systemUptime: "99.9%",
        reportGrowth: growth,
        complianceTrend: complianceTrend,
        efficiencyScore: efficiencyScore,
      });
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (health: number) => {
    if (health >= 90) return "text-green-600 dark:text-green-400";
    if (health >= 75) return "text-blue-600 dark:text-blue-400";
    if (health >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getHealthBg = (health: number) => {
    if (health >= 90) return "bg-green-50 dark:bg-green-900/20";
    if (health >= 75) return "bg-blue-50 dark:bg-blue-900/20";
    if (health >= 60) return "bg-yellow-50 dark:bg-yellow-900/20";
    return "bg-red-50 dark:bg-red-900/20";
  };

  return (
    <>
      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* System Health */}
        <div className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-700 to-slate-800 p-6 text-white dark:border-gray-800`}>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"></div>
          <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/5"></div>
          <div className="relative">
            <div className="mb-2 text-sm font-medium text-slate-300">System Health</div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold">{metrics.systemHealth}%</div>
              <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-semibold">
                {metrics.complianceTrend >= 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
                {Math.abs(metrics.complianceTrend)}%
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-300">Overall system performance</div>
          </div>
        </div>

        {/* Total Reports */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white dark:border-gray-800">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"></div>
          <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/5"></div>
          <div className="relative">
            <div className="mb-2 text-sm font-medium text-blue-100">Total Reports</div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold">{metrics.totalReports}</div>
              <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-semibold">
                {metrics.reportGrowth >= 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
                {Math.abs(metrics.reportGrowth)}%
              </div>
            </div>
            <div className="mt-4 text-xs text-blue-100">Across all modules</div>
          </div>
        </div>

        {/* Compliance Score */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white dark:border-gray-800">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"></div>
          <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/5"></div>
          <div className="relative">
            <div className="mb-2 text-sm font-medium text-emerald-100">Avg Compliance</div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold">{metrics.avgComplianceScore}%</div>
              <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-semibold">
                {metrics.complianceTrend >= 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
                {Math.abs(metrics.complianceTrend)}%
              </div>
            </div>
            <div className="mt-4 text-xs text-emerald-100">Quality & Operations</div>
          </div>
        </div>

        {/* Active Users */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-amber-600 to-amber-700 p-6 text-white dark:border-gray-800">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"></div>
          <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/5"></div>
          <div className="relative">
            <div className="mb-2 text-sm font-medium text-amber-100">Active Users</div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold">{metrics.activeUsers}</div>
              <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                Live
              </div>
            </div>
            <div className="mt-4 text-xs text-amber-100">Registered in system</div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
              <span className="text-xl">✅</span>
            </div>
            <div>
              <div className="page-title">{metrics.completedToday}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Completed Today</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <span className="text-xl">⏳</span>
            </div>
            <div>
              <div className="page-title">{metrics.pendingActions}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Pending Actions</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
              <span className="text-xl">🚨</span>
            </div>
            <div>
              <div className="page-title">{metrics.criticalAlerts}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Critical Alerts</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <div className="page-title">{metrics.efficiencyScore}%</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Efficiency Score</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
