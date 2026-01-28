"use client";
import React, { useState, useEffect } from "react";

export default function QuickStats() {
  const [stats, setStats] = useState({
    qms: { total: 0, completed: 0, pending: 0, avgScore: 0 },
    operations: { total: 0, completed: 0, pending: 0, avgScore: 0 },
  });

  useEffect(() => {
    const loadStats = () => {
      // QMS Data
      const qmsReports = [
        ...JSON.parse(localStorage.getItem("svr_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("qsc_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("ttf_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("qualityAuditReports") || "[]"),
        ...JSON.parse(localStorage.getItem("trainingAuditReports") || "[]"),
      ];

      const qmsCompleted = qmsReports.filter((r: any) => 
        r.status === "completed" || r.systemApproval?.approved
      ).length;
      const qmsPending = qmsReports.length - qmsCompleted;
      const qmsScores = qmsReports
        .map((r: any) => r.score?.percentage || parseInt(r.score) || 0)
        .filter(s => s > 0);
      const qmsAvgScore = qmsScores.length > 0 
        ? Math.round(qmsScores.reduce((a, b) => a + b, 0) / qmsScores.length)
        : 0;

      // Operations Data
      const operationsReports = [
        ...JSON.parse(localStorage.getItem("operational_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("maintenance_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("incident_reports") || "[]"),
        ...JSON.parse(localStorage.getItem("performance_reports") || "[]"),
      ];

      const opsCompleted = operationsReports.filter((r: any) => 
        r.status === "completed" || r.status === "closed"
      ).length;
      const opsPending = operationsReports.length - opsCompleted;
      const opsScores = operationsReports
        .map((r: any) => r.efficiency?.score || r.score?.percentage || parseInt(r.score) || 0)
        .filter(s => s > 0);
      const opsAvgScore = opsScores.length > 0 
        ? Math.round(opsScores.reduce((a, b) => a + b, 0) / opsScores.length)
        : 0;

      setStats({
        qms: {
          total: qmsReports.length,
          completed: qmsCompleted,
          pending: qmsPending,
          avgScore: qmsAvgScore,
        },
        operations: {
          total: operationsReports.length,
          completed: opsCompleted,
          pending: opsPending,
          avgScore: opsAvgScore,
        },
      });
    };

    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, stats, color, icon }: any) => (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className={`border-b border-gray-200 bg-gradient-to-r ${color} px-6 py-4 dark:border-gray-800`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Reports</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.avgScore}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completed}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.pending}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Completion Rate</span>
            <span>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${color}`}
              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <StatCard
        title="QMS Module"
        stats={stats.qms}
        color="from-purple-600 to-indigo-600"
        icon="🎯"
      />
      <StatCard
        title="Operations Module"
        stats={stats.operations}
        color="from-blue-600 to-cyan-600"
        icon="⚙️"
      />
    </div>
  );
}
