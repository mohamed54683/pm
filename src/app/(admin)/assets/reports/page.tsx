"use client";
import React, { useState } from "react";

const reportTypes = [
  { id:"register", name:"Asset Register", desc:"Complete list of all assets with details", icon:"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id:"movement", name:"Asset Movement", desc:"Transfer history and asset location changes", icon:"M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { id:"custody", name:"Custody Report", desc:"Asset assignments to employees", icon:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { id:"depreciation", name:"Depreciation Schedule", desc:"Asset depreciation calculations and book values", icon:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id:"clearance", name:"Clearance Report", desc:"Employee clearance status and history", icon:"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  { id:"audit", name:"Audit Trail", desc:"Complete change history for all asset operations", icon:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

const fmt = (v:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v||0);
const fmtDate = (d:string) => d ? new Date(d).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}) : "—";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ branch_id:"", category_id:"", status:"", from_date:"", to_date:"" });

  const runReport = async (type: string) => {
    setActiveReport(type); setLoading(true); setData([]);
    try {
      const p = new URLSearchParams({ type });
      Object.entries(filters).forEach(([k,v]) => { if(v) p.set(k,v); });
      const r = await fetch(`/api/assets/reports?${p}`);
      const d = await r.json();
      if (d.success) setData(d.data);
    } finally { setLoading(false); }
  };

  const renderTable = () => {
    if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" /></div>;
    if (!data.length) return <div className="py-16 text-center text-sm text-gray-500">No data found for this report</div>;

    switch (activeReport) {
      case "register": return (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900"><tr>{["Tag","Name","Category","Branch","Status","Condition","Purchase Cost","Current Value","Assigned To"].map(h=><th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{data.map((r:any,i:number)=>(
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30"><td className="px-3 py-2 text-sm font-mono text-blue-600">{r.asset_tag}</td><td className="px-3 py-2 text-sm">{r.name}</td><td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{r.category_name||"—"}</td><td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{r.branch_name||"—"}</td><td className="px-3 py-2"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-gray-700 dark:text-gray-300">{r.status}</span></td><td className="px-3 py-2 text-sm capitalize">{r.condition_status}</td><td className="px-3 py-2 text-sm text-right">{fmt(r.purchase_cost)}</td><td className="px-3 py-2 text-sm text-right">{fmt(r.current_value)}</td><td className="px-3 py-2 text-sm">{r.assigned_to_name||"—"}</td></tr>
          ))}</tbody>
        </table>
      );
      case "movement": return (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900"><tr>{["Transfer #","Asset","From","To","Date","Status","Reason"].map(h=><th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{data.map((r:any,i:number)=>(
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30"><td className="px-3 py-2 text-sm font-mono text-blue-600">{r.transfer_number}</td><td className="px-3 py-2 text-sm">{r.asset_name} <span className="text-xs text-gray-400">({r.asset_tag})</span></td><td className="px-3 py-2 text-sm">{r.from_branch_name||"—"}</td><td className="px-3 py-2 text-sm">{r.to_branch_name||"—"}</td><td className="px-3 py-2 text-sm whitespace-nowrap">{fmtDate(r.transfer_date)}</td><td className="px-3 py-2"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-gray-700 dark:text-gray-300">{r.status}</span></td><td className="px-3 py-2 text-sm text-gray-600">{r.reason||"—"}</td></tr>
          ))}</tbody>
        </table>
      );
      case "custody": return (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900"><tr>{["Custody #","Asset","Employee","Type","Issued","Return Due","Status","Condition"].map(h=><th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{data.map((r:any,i:number)=>(
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30"><td className="px-3 py-2 text-sm font-mono text-blue-600">{r.custody_number}</td><td className="px-3 py-2 text-sm">{r.asset_name} <span className="text-xs text-gray-400">({r.asset_tag})</span></td><td className="px-3 py-2 text-sm">{r.employee_name}</td><td className="px-3 py-2 text-sm capitalize">{r.custody_type}</td><td className="px-3 py-2 text-sm whitespace-nowrap">{fmtDate(r.issued_date)}</td><td className="px-3 py-2 text-sm whitespace-nowrap">{fmtDate(r.expected_return_date)}</td><td className="px-3 py-2"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-gray-700 dark:text-gray-300">{r.status}</span></td><td className="px-3 py-2 text-sm capitalize">{r.condition_at_handover||"—"}</td></tr>
          ))}</tbody>
        </table>
      );
      case "depreciation": return (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900"><tr>{["Asset","Purchase Cost","Salvage Value","Useful Life","Accum. Depreciation","Book Value","Method"].map(h=><th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{data.map((r:any,i:number)=>(
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30"><td className="px-3 py-2 text-sm">{r.name} <span className="text-xs text-gray-400 font-mono">({r.asset_tag})</span></td><td className="px-3 py-2 text-sm text-right">{fmt(r.purchase_cost)}</td><td className="px-3 py-2 text-sm text-right">{fmt(r.salvage_value)}</td><td className="px-3 py-2 text-sm text-center">{r.useful_life_months?`${r.useful_life_months}m`:"—"}</td><td className="px-3 py-2 text-sm text-right">{fmt(r.accumulated_depreciation)}</td><td className="px-3 py-2 text-sm text-right font-semibold">{fmt(r.current_value)}</td><td className="px-3 py-2 text-sm capitalize">{r.depreciation_method?.replace("_"," ")||"—"}</td></tr>
          ))}</tbody>
        </table>
      );
      case "clearance": return (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900"><tr>{["Clearance #","Employee","Reason","Date","Status","Pending Assets","Approved By"].map(h=><th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{data.map((r:any,i:number)=>(
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30"><td className="px-3 py-2 text-sm font-mono text-blue-600">{r.clearance_number}</td><td className="px-3 py-2 text-sm">{r.employee_name}</td><td className="px-3 py-2 text-sm capitalize">{r.reason?.replace("_"," ")}</td><td className="px-3 py-2 text-sm whitespace-nowrap">{fmtDate(r.clearance_date)}</td><td className="px-3 py-2"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-gray-700 dark:text-gray-300">{r.status}</span></td><td className="px-3 py-2 text-sm text-center">{r.has_pending_assets||0}</td><td className="px-3 py-2 text-sm">{r.approved_by_name||"—"}</td></tr>
          ))}</tbody>
        </table>
      );
      case "audit": return (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900"><tr>{["Date","User","Action","Entity","Entity ID","Old Value","New Value"].map(h=><th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{data.map((r:any,i:number)=>(
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30"><td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.created_at)}</td><td className="px-3 py-2 text-sm">{r.user_name||"System"}</td><td className="px-3 py-2"><span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{r.action}</span></td><td className="px-3 py-2 text-sm capitalize">{r.entity_type?.replace("_"," ")}</td><td className="px-3 py-2 text-sm font-mono">{r.entity_id}</td><td className="px-3 py-2 text-xs text-gray-500 max-w-[200px] truncate">{r.old_value||"—"}</td><td className="px-3 py-2 text-xs text-gray-500 max-w-[200px] truncate">{r.new_value||"—"}</td></tr>
          ))}</tbody>
        </table>
      );
      default: return null;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Asset Reports</h1>
        <p className="page-subtitle">Generate and view asset management reports</p>
      </div>

      {!activeReport ? (
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map(rt => (
            <button key={rt.id} onClick={()=>runReport(rt.id)} className="flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30"><svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={rt.icon} /></svg></div>
              <div><h3 className="font-semibold text-gray-900 dark:text-white">{rt.name}</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{rt.desc}</p></div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button onClick={()=>{setActiveReport("");setData([]);}} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Back
            </button>
            <h2 className="card-title">{reportTypes.find(r=>r.id===activeReport)?.name}</h2>
            <div className="ml-auto flex items-center gap-2">
              <input type="date" value={filters.from_date} onChange={e=>setFilters({...filters,from_date:e.target.value})} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="From" />
              <input type="date" value={filters.to_date} onChange={e=>setFilters({...filters,to_date:e.target.value})} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="To" />
              <button onClick={()=>runReport(activeReport)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Refresh</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            {renderTable()}
          </div>
          <div className="mt-3 text-sm text-gray-500">{data.length} record{data.length!==1?"s":""} found</div>
        </div>
      )}
    </div>
  );
}
