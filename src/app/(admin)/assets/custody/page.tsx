"use client";
import React, { useState, useEffect, useCallback } from "react";

interface CustodyRecord {
  id:number; custody_number:string; asset_id:number; asset_tag:string; asset_name:string;
  employee_id:number; employee_name:string; department_name:string;
  custody_type:string; purpose:string; status:string;
  issued_date:string; expected_return_date:string; actual_return_date:string;
  condition_at_handover:string; condition_at_return:string;
  approved_by_name:string; approved_at:string; notes:string; created_at:string;
}
interface Opt { id:number; name:string; }
interface AssetOpt { id:number; asset_tag:string; name:string; }

const statusColors: Record<string,string> = {
  pending:"bg-yellow-100 text-yellow-700", approved:"bg-blue-100 text-blue-700",
  active:"bg-green-100 text-green-700", released:"bg-gray-100 text-gray-600",
  rejected:"bg-red-100 text-red-700", revoked:"bg-red-200 text-red-800"
};

export default function CustodyPage() {
  const [records, setRecords] = useState<CustodyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [assets, setAssets] = useState<AssetOpt[]>([]);
  const [users, setUsers] = useState<Opt[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ asset_id:"",employee_id:"",custody_type:"permanent",purpose:"",expected_return_date:"",condition_at_handover:"good",notes:"" });
  const [actionConfirm, setActionConfirm] = useState<{id:number;action:string;cond?:string}|null>(null);
  const [returnCond, setReturnCond] = useState("good");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ search, page:page.toString(), limit:"25" });
      if (filterStatus) p.set("status", filterStatus);
      const r = await fetch(`/api/assets/custody?${p}`);
      const d = await r.json();
      if (d.success) { setRecords(d.data); setTotalPages(d.pagination?.totalPages||1); }
    } finally { setLoading(false); }
  }, [search, page, filterStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([
      fetch("/api/assets?limit=500&status=available").then(r=>r.json()),
      fetch("/api/settings/users?limit=200&status=active").then(r=>r.json()),
    ]).then(([a,u]) => {
      if(a.success) setAssets(a.data.map((x:any)=>({id:x.id,asset_tag:x.asset_tag,name:x.name})));
      if(u.success) setUsers(u.data.map((x:any)=>({id:x.id,name:x.name||`${x.first_name||""} ${x.last_name||""}`.trim()})));
    });
  }, []);

  const create = async () => {
    if (!form.asset_id||!form.employee_id) { setError("Asset and employee required"); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/assets/custody", { method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ asset_id:parseInt(form.asset_id), employee_id:parseInt(form.employee_id), custody_type:form.custody_type, purpose:form.purpose, expected_return_date:form.expected_return_date||null, condition_at_handover:form.condition_at_handover, notes:form.notes })
      });
      const d = await r.json();
      if (d.success) { setShowCreate(false); setForm({asset_id:"",employee_id:"",custody_type:"permanent",purpose:"",expected_return_date:"",condition_at_handover:"good",notes:""}); setMsg("Custody request created"); setTimeout(()=>setMsg(""),3000); load(); }
      else setError(d.error);
    } catch { setError("Failed"); } finally { setSaving(false); }
  };

  const doAction = async (id: number, status: string, cond?: string) => {
    const body: any = { id, status };
    if (status === "released" && cond) body.condition_at_return = cond;
    const r = await fetch("/api/assets/custody", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    const d = await r.json();
    if (d.success) { setMsg(`Custody ${status}`); setTimeout(()=>setMsg(""),3000); load(); }
    else { setError(d.error); setTimeout(()=>setError(""),4000); }
    setActionConfirm(null);
  };

  const fmtDate = (d:string) => d ? new Date(d).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}) : "—";

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><h1 className="page-title">Custody Management</h1><p className="page-subtitle">Manage asset assignments to employees</p></div>
          <button onClick={()=>{setShowCreate(true);setError("");}} className="btn-primary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Custody
          </button>
        </div>
      </div>
      {msg && <div className="mx-6 mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">{msg}</div>}
      {error && !showCreate && <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

      <div className="flex flex-wrap items-center gap-3 px-6 py-4">
        <div className="relative flex-1 min-w-[200px] max-w-md"><svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input type="text" placeholder="Search custody records..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></div>
        <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
          <option value="">All Status</option>
          {["pending","approved","active","released","rejected","revoked"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="px-6 pb-6">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900"><tr>
              {["Custody #","Asset","Employee","Type","Issued","Return Due","Status","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading?(<tr><td colSpan={8} className="py-12 text-center"><div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div></td></tr>
              ):records.length===0?(<tr><td colSpan={8} className="py-12 text-center text-sm text-gray-500">No custody records found</td></tr>
              ):records.map(c=>(
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600 dark:text-blue-400">{c.custody_number}</td>
                  <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900 dark:text-white">{c.asset_name}</p><p className="text-xs text-gray-500">{c.asset_tag}</p></td>
                  <td className="px-4 py-3"><p className="text-sm text-gray-900 dark:text-white">{c.employee_name}</p>{c.department_name&&<p className="text-xs text-gray-500">{c.department_name}</p>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{c.custody_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDate(c.issued_date||c.created_at)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDate(c.expected_return_date)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[c.status]||"bg-gray-100 text-gray-600"}`}>{c.status}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1">
                    {actionConfirm?.id===c.id ? (
                      <div className="flex gap-1 items-center">
                        {actionConfirm.action==="released" && <select value={returnCond} onChange={e=>setReturnCond(e.target.value)} className="rounded border px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white">{["new","good","fair","poor","damaged"].map(v=><option key={v} value={v}>{v}</option>)}</select>}
                        <button onClick={()=>doAction(c.id,actionConfirm.action,actionConfirm.action==="released"?returnCond:undefined)} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Yes</button>
                        <button onClick={()=>setActionConfirm(null)} className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700">No</button>
                      </div>
                    ) : (<>
                      {c.status==="pending" && <>
                        <button onClick={()=>setActionConfirm({id:c.id,action:"approved"})} className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200">Approve</button>
                        <button onClick={()=>setActionConfirm({id:c.id,action:"rejected"})} className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200">Reject</button>
                      </>}
                      {c.status==="approved" && <button onClick={()=>setActionConfirm({id:c.id,action:"active"})} className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200">Hand Over</button>}
                      {c.status==="active" && <>
                        <button onClick={()=>{setReturnCond("good");setActionConfirm({id:c.id,action:"released"});}} className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200">Release</button>
                        <button onClick={()=>setActionConfirm({id:c.id,action:"revoked"})} className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200">Revoke</button>
                      </>}
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
              <h2 className="card-title">New Custody Request</h2>
              <button onClick={()=>setShowCreate(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="space-y-4 px-6 py-4">
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset <span className="text-red-500">*</span></label><select value={form.asset_id} onChange={e=>setForm({...form,asset_id:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">Select asset</option>{assets.map(a=><option key={a.id} value={a.id}>{a.asset_tag} — {a.name}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Employee <span className="text-red-500">*</span></label><select value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">Select employee</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label><select value={form.custody_type} onChange={e=>setForm({...form,custody_type:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="permanent">Permanent</option><option value="temporary">Temporary</option><option value="project">Project</option></select></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Return</label><input type="date" value={form.expected_return_date} onChange={e=>setForm({...form,expected_return_date:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Condition at Handover</label><select value={form.condition_at_handover} onChange={e=>setForm({...form,condition_at_handover:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">{["new","good","fair","poor"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Purpose</label><textarea value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button onClick={()=>setShowCreate(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={create} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">{saving&&<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}Create Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
