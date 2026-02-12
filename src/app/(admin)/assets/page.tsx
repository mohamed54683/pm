"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardData {
  summary: {
    total_assets: number;
    total_current_value: number;
    total_purchase_value: number;
    total_depreciation: number;
    pending_transfers: number;
    active_custody: number;
    pending_clearances: number;
  };
  status_breakdown: { status: string; cnt: number }[];
  branch_breakdown: { name: string; cnt: number; total_value: number }[];
  category_breakdown: { name: string; cnt: number }[];
  recent_activity: { id: number; entity_type: string; action: string; asset_name: string; asset_tag: string; performed_by_name: string; created_at: string }[];
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  assigned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_transfer: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  maintenance: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  depreciated: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  scrapped: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  lost: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

const formatCurrency = (val: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val || 0);
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function AssetsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/assets/dashboard")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const s = data?.summary;

  const kpiCards = [
    { label: "Total Assets", value: s?.total_assets || 0, icon: "📦", color: "blue", link: "/assets/register" },
    { label: "Current Value", value: formatCurrency(s?.total_current_value || 0), icon: "💰", color: "green" },
    { label: "Depreciation", value: formatCurrency(s?.total_depreciation || 0), icon: "📉", color: "orange" },
    { label: "Pending Transfers", value: s?.pending_transfers || 0, icon: "🔄", color: "yellow", link: "/assets/transfers" },
    { label: "Active Custody", value: s?.active_custody || 0, icon: "🤝", color: "purple", link: "/assets/custody" },
    { label: "Pending Clearances", value: s?.pending_clearances || 0, icon: "📋", color: "red", link: "/assets/clearances" },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Asset & Custody Management</h1>
            <p className="page-subtitle">Centralized asset tracking, transfers, custody, and compliance</p>
          </div>
          <Link href="/assets/register" className="btn-primary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Asset
          </Link>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpiCards.map((k) => {
            const Card = (
              <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{k.icon}</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{k.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
              </div>
            );
            return k.link ? <Link key={k.label} href={k.link}>{Card}</Link> : <div key={k.label}>{Card}</div>;
          })}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Asset Register", path: "/assets/register", icon: "📋" },
            { label: "Categories", path: "/assets/categories", icon: "🏷️" },
            { label: "Branches", path: "/assets/branches", icon: "🏢" },
            { label: "Transfers", path: "/assets/transfers", icon: "🔄" },
            { label: "Custody", path: "/assets/custody", icon: "🤝" },
            { label: "Clearances", path: "/assets/clearances", icon: "✅" },
          ].map((l) => (
            <Link key={l.path} href={l.path} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Status Breakdown */}
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Asset Status Breakdown</h3>
            {data?.status_breakdown?.length ? (
              <div className="space-y-3">
                {data.status_breakdown.map((s) => {
                  const total = data.summary.total_assets || 1;
                  const pct = Math.round((s.cnt / total) * 100);
                  return (
                    <div key={s.status}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${statusColors[s.status] || "bg-gray-100 text-gray-600"}`}>{s.status.replace("_", " ")}</span>
                        <span className="text-gray-500">{s.cnt} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-gray-400">No assets yet</p>}
          </div>

          {/* By Branch */}
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Assets by Branch</h3>
            {data?.branch_breakdown?.length ? (
              <div className="space-y-2">
                {data.branch_breakdown.map((b) => (
                  <div key={b.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{b.name || "Unassigned"}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{b.cnt}</span>
                      <span className="ml-2 text-xs text-gray-500">{formatCurrency(b.total_value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No data</p>}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            <Link href="/assets/reports" className="text-xs text-blue-600 hover:underline dark:text-blue-400">View All Reports</Link>
          </div>
          {data?.recent_activity?.length ? (
            <div className="space-y-2">
              {data.recent_activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      a.entity_type === "asset" ? "bg-blue-100 text-blue-700" :
                      a.entity_type === "transfer" ? "bg-yellow-100 text-yellow-700" :
                      a.entity_type === "custody" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                    }`}>{a.entity_type}</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{a.asset_tag || ""}</span> {a.action.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{a.performed_by_name}</span>
                    <span>{formatDate(a.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No recent activity</p>}
        </div>
      </div>
    </div>
  );
}
