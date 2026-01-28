"use client";
import React, { useState, useEffect } from "react";

export default function RecentSystemActivity() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const loadActivities = () => {
      const qmsReports = [
        ...JSON.parse(localStorage.getItem("svr_reports") || "[]").map((r: any) => ({ ...r, module: "QMS", type: "SVR" })),
        ...JSON.parse(localStorage.getItem("qsc_reports") || "[]").map((r: any) => ({ ...r, module: "QMS", type: "QSC" })),
        ...JSON.parse(localStorage.getItem("ttf_reports") || "[]").map((r: any) => ({ ...r, module: "QMS", type: "TTF" })),
        ...JSON.parse(localStorage.getItem("qualityAuditReports") || "[]").map((r: any) => ({ ...r, module: "QMS", type: "Quality Audit" })),
        ...JSON.parse(localStorage.getItem("trainingAuditReports") || "[]").map((r: any) => ({ ...r, module: "QMS", type: "Training Audit" })),
      ];

      const operationsReports = [
        ...JSON.parse(localStorage.getItem("operational_reports") || "[]").map((r: any) => ({ ...r, module: "Operations", type: "Operational" })),
        ...JSON.parse(localStorage.getItem("maintenance_reports") || "[]").map((r: any) => ({ ...r, module: "Operations", type: "Maintenance" })),
        ...JSON.parse(localStorage.getItem("incident_reports") || "[]").map((r: any) => ({ ...r, module: "Operations", type: "Incident" })),
        ...JSON.parse(localStorage.getItem("performance_reports") || "[]").map((r: any) => ({ ...r, module: "Operations", type: "Performance" })),
      ];

      const allActivities = [...qmsReports, ...operationsReports];
      allActivities.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.submittedAt || a.date);
        const dateB = new Date(b.createdAt || b.submittedAt || b.date);
        return dateB.getTime() - dateA.getTime();
      });

      setActivities(allActivities.slice(0, 8));
    };

    loadActivities();
    const interval = setInterval(loadActivities, 10000);
    return () => clearInterval(interval);
  }, []);

  const getModuleColor = (module: string) => {
    return module === "QMS"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  };

  const getStatusBadge = (activity: any) => {
    const status = activity.status || "pending";
    if (status === "completed" || activity.systemApproval?.approved) {
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    }
    if (status === "in-progress") {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  };

  const getStatusText = (activity: any) => {
    if (activity.systemApproval?.approved) return "Approved";
    if (activity.status === "completed") return "Completed";
    if (activity.status === "in-progress") return "In Progress";
    return "Pending";
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Recent System Activity
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Latest activities across all modules
        </p>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {activities.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            No recent activities found
          </div>
        ) : (
          activities.map((activity, index) => (
            <div key={index} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm">
                    {activity.type?.substring(0, 2) || "OP"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getModuleColor(activity.module)}`}>
                        {activity.module}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.type}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {activity.storeName || activity.location || "N/A"} • {new Date(activity.createdAt || activity.submittedAt || activity.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const score = activity.score?.percentage || parseInt(activity.score) || activity.efficiency?.score || 0;
                    return score > 0 ? (
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{score}%</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                      </div>
                    ) : null;
                  })()}
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(activity)}`}>
                    {getStatusText(activity)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
