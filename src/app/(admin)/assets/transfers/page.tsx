"use client";
import React, { useState, useEffect, useCallback } from "react";

interface Transfer {
  id:number; transfer_number:string; asset_id:number; asset_tag:string; asset_name:string;
  from_branch_id:number; from_branch_name:string; to_branch_id:number; to_branch_name:string;
  from_department_name:string; to_department_name:string;
  transfer_date:string; reason:string; status:string; approved_by_name:string; approved_at:string;
  received_by_name:string; received_at:string; notes:string; created_at:string;
}
interface Opt { id:number; name:string; code?:string; }
interface AssetOpt { id:number; asset_tag:string; name:string; branch_id:number; branch_name:string; }

const statusColors: Record<string,string> = {
  pending:"bg-yellow-100 text-yellow-700", approved:"bg-blue-100 text-blue-700",
  in_transit:"bg-purple-100 text-purple-700", received:"bg-green-100 text-green-700",
  rejected:"bg-red-100 text-red-700", cancelled:"bg-gray-100 text-gray-600"
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [branches, setBranches] = useState<Opt[]>([]);
  const [depts, setDepts] = useState<Opt[]>([]);
  const [assets, setAssets] = useState<AssetOpt[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ asset_id:"", to_branch_id:"", to_department_id:"", reason:"", notes:"", depreciation_action:"continue" });
  const [actionConfirm, setActionConfirm] = useState<{ id:number; action:string }|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ search, page:page.toString(), limit:"25" });
      if (filterStatus) p.set("status", filterStatus);
      const r = await fetch(`/api/assets/transfers?${p}`);
      const d = await r.json();
      if (d.success) { setTransfers(d.data); setTotalPages(d.pagination?.totalPages||1); }
    } finally { setLoading(false); }
  }, [search, page, filterStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([
      fetch("/api/assets/branches?limit=200").then(r=>r.json()),
      fetch("/api/settings/departments?limit=200").then(r=>r.json()),
      fetch("/api/assets?limit=500&status=available").then(r=>r.json()),
    ]).then(([b,d,a]) => {
      if(b.success) setBranches(b.data.map((x:any)=>({id:x.id,name:x.name,code:x.code})));
      if(d.success) setDepts(d.data.map((x:any)=>({id:x.id,name:x.name})));
      if(a.success) setAssets(a.data.map((x:any)=>({id:x.id,asset_tag:x.asset_tag,name:x.name,branch_id:x.branch_id,branch_name:x.branch_name})));
    });
  }, []);

  const create = async () => {
    if (!form.asset_id||!form.to_branch_id) { setError("Asset and destination branch required"); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/assets/transfers", { method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ asset_id:parseInt(form.asset_id), to_branch_id:parseInt(form.to_branch_id), to_department_id:form.to_department_id?parseInt(form.to_department_id):null, reason:form.reason, notes:form.notes, depreciation_action:form.depreciation_action })
      });
      const d = await r.json();
      if (d.success) { setShowCreate(false); setForm({asset_id:"",to_branch_id:"",to_department_id:"",reason:"",notes:"",depreciation_action:"continue"}); setMsg("Transfer created"); setTimeout(()=>setMsg(""),3000); load(); }
      else setError(d.error);
    } catch { setError("Failed"); } finally { setSaving(false); }
  };

  const doAction = async (id: number, status: string) => {
    const r = await fetch("/api/assets/transfers", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id,status}) });
    const d = await r.json();
    if (d.success) { setMsg(`Transfer ${status}`); setTimeout(()=>setMsg(""),3000); load(); }
    else { setError(d.error); setTimeout(()=>setError(""),4000); }
    setActionConfirm(null);
  };

  const fmtDate = (d:string) => d ? new Date(d).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}) : "—";

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><h1 className="page-title">Asset Transfers</h1><p className="page-subtitle">Track asset movement between branches &amp; departments</p></div>
          <button onClick={()=>{setShowCreate(true);setError("");}} className="btn-primary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Transfer
          </button>
        </div>
      </div>
      {msg && <div className="mx-6 mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">{msg}</div>}
      {error && !showCreate && <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

      <div className="flex flex-wrap items-center gap-3 px-6 py-4">
        <div className="relative flex-1 min-w-[200px] max-w-md"><svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input type="text" placeholder="Search transfers..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></div>
        <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
          <option value="">All Status</option>
          {["pending","approved","in_transit","received","rejected","cancelled"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
      </div>

      <div className="px-6 pb-6">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900"><tr>
              {["Transfer #","Asset","From","To","Date","Status","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading?(<tr><td colSpan={7} className="py-12 text-center"><div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div></td></tr>
              ):transfers.length===0?(<tr><td colSpan={7} className="py-12 text-center text-sm text-gray-500">No transfers found</td></tr>
              ):transfers.map(t=>(
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600 dark:text-blue-400">{t.transfer_number}</td>
                  <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900 dark:text-white">{t.asset_name}</p><p className="text-xs text-gray-500">{t.asset_tag}</p></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{t.from_branch_name||"—"}{t.from_department_name&&<span className="text-xs text-gray-400"> · {t.from_department_name}</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{t.to_branch_name||"—"}{t.to_department_name&&<span className="text-xs text-gray-400"> · {t.to_department_name}</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDate(t.transfer_date||t.created_at)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[t.status]||"bg-gray-100 text-gray-600"}`}>{t.status.replace("_"," ")}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1">
                    {actionConfirm?.id===t.id ? (
                      <div className="flex gap-1 items-center"><span className="text-xs text-gray-500 mr-1">{actionConfirm.action}?</span><button onClick={()=>doAction(t.id,actionConfirm.action)} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Yes</button><button onClick={()=>setActionConfirm(null)} className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700">No</button></div>
                    ) : (<>
                      {t.status==="pending" && <>
                        <button onClick={()=>setActionConfirm({id:t.id,action:"approved"})} className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200" title="Approve">Approve</button>
                        <button onClick={()=>setActionConfirm({id:t.id,action:"rejected"})} className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200" title="Reject">Reject</button>
                      </>}
                      {t.status==="approved" && <button onClick={()=>setActionConfirm({id:t.id,action:"in_transit"})} className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200">Ship</button>}
                      {t.status==="in_transit" && <button onClick={()=>setActionConfirm({id:t.id,action:"received"})} className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200">Receive</button>}
                      {(t.status==="pending"||t.status==="approved") && <button onClick={()=>setActionConfirm({id:t.id,action:"cancelled"})} className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200">Cancel</button>}
                    </>)}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button onClick={()=>setPage(Math.max(1,page-1))} disabled={page===1} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300">Prev</button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
            <button onClick={()=>setPage(Math.min(totalPages,page+1))} disabled={page===totalPages} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300">Next</button>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="card-title">New Transfer</h2>
              <button onClick={()=>setShowCreate(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="space-y-4 px-6 py-4">
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset <span className="text-red-500">*</span></label><select value={form.asset_id} onChange={e=>setForm({...form,asset_id:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">Select asset</option>{assets.map(a=><option key={a.id} value={a.id}>{a.asset_tag} — {a.name} ({a.branch_name})</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">To Branch <span className="text-red-500">*</span></label><select value={form.to_branch_id} onChange={e=>setForm({...form,to_branch_id:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">Select branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">To Department</label><select value={form.to_department_id} onChange={e=>setForm({...form,to_department_id:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">—</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label><textarea value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Depreciation on Transfer</label><select value={form.depreciation_action} onChange={e=>setForm({...form,depreciation_action:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="continue">Continue current</option><option value="reset">Reset</option><option value="revalue">Revalue</option></select></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button onClick={()=>setShowCreate(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={create} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">{saving&&<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}Create Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
