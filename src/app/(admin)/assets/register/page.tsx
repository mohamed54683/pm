"use client";
import React, { useState, useEffect, useCallback } from "react";

interface Asset {
  id:number; asset_tag:string; name:string; description:string; category_id:number; category_name:string;
  branch_id:number; branch_name:string; branch_code:string; department_name:string;
  serial_number:string; model:string; manufacturer:string; purchase_date:string; purchase_cost:number;
  current_value:number; accumulated_depreciation:number; salvage_value:number; useful_life_months:number;
  depreciation_method:string; warranty_expiry:string; status:string; condition_status:string;
  assigned_to:number; assigned_to_name:string; barcode:string; notes:string;
}
interface Opt { id:number; name:string; code?:string; }
interface UserOpt { id:number; name:string; email:string; }

const statusColors: Record<string,string> = {
  available:"bg-green-100 text-green-700", assigned:"bg-blue-100 text-blue-700",
  in_transfer:"bg-yellow-100 text-yellow-700", maintenance:"bg-orange-100 text-orange-700",
  depreciated:"bg-gray-100 text-gray-600", scrapped:"bg-red-100 text-red-700", lost:"bg-red-200 text-red-800"
};
const condColors: Record<string,string> = { new:"bg-green-100 text-green-700", good:"bg-blue-100 text-blue-700", fair:"bg-yellow-100 text-yellow-700", poor:"bg-orange-100 text-orange-700", damaged:"bg-red-100 text-red-700" };

const emptyForm = { asset_tag:"",name:"",description:"",category_id:"",branch_id:"",department_id:"",serial_number:"",model:"",manufacturer:"",purchase_date:"",purchase_cost:"",current_value:"",salvage_value:"",useful_life_months:"",depreciation_method:"straight_line",depreciation_start_date:"",warranty_expiry:"",status:"available",condition_status:"new",barcode:"",notes:"" };

const fmt = (v:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v||0);

export default function AssetRegisterPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [branches, setBranches] = useState<Opt[]>([]);
  const [depts, setDepts] = useState<Opt[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [delConfirm, setDelConfirm] = useState<number|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: page.toString(), limit: "25" });
      if (filterStatus) params.set("status", filterStatus);
      if (filterBranch) params.set("branch_id", filterBranch);
      if (filterCategory) params.set("category_id", filterCategory);
      const r = await fetch(`/api/assets?${params}`);
      const d = await r.json();
      if (d.success) { setAssets(d.data); setTotalPages(d.pagination.totalPages); }
    } finally { setLoading(false); }
  }, [search, page, filterStatus, filterBranch, filterCategory]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([
      fetch("/api/assets/categories?limit=200").then(r=>r.json()),
      fetch("/api/assets/branches?limit=200").then(r=>r.json()),
      fetch("/api/settings/departments?limit=200").then(r=>r.json()),
      fetch("/api/settings/users?limit=200&status=active").then(r=>r.json()),
    ]).then(([c,b,d,u]) => {
      if(c.success) setCategories(c.data.map((x:any)=>({id:x.id,name:x.name})));
      if(b.success) setBranches(b.data.map((x:any)=>({id:x.id,name:x.name,code:x.code})));
      if(d.success) setDepts(d.data.map((x:any)=>({id:x.id,name:x.name})));
      if(u.success) setUsers(u.data.map((x:any)=>({id:x.id,name:x.name||`${x.first_name||""} ${x.last_name||""}`.trim(),email:x.email})));
    });
  }, []);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setError(""); setShowModal(true); };
  const openEdit = (a: Asset) => {
    setEditId(a.id); setForm({
      asset_tag:a.asset_tag, name:a.name, description:a.description||"", category_id:a.category_id?.toString()||"",
      branch_id:a.branch_id?.toString()||"", department_id:"", serial_number:a.serial_number||"", model:a.model||"",
      manufacturer:a.manufacturer||"", purchase_date:a.purchase_date?.split("T")[0]||"", purchase_cost:a.purchase_cost?.toString()||"",
      current_value:a.current_value?.toString()||"", salvage_value:a.salvage_value?.toString()||"",
      useful_life_months:a.useful_life_months?.toString()||"", depreciation_method:a.depreciation_method||"straight_line",
      depreciation_start_date:"", warranty_expiry:a.warranty_expiry?.split("T")[0]||"", status:a.status,
      condition_status:a.condition_status||"new", barcode:a.barcode||"", notes:a.notes||""
    });
    setError(""); setShowModal(true);
  };

  const save = async () => {
    if (!form.asset_tag.trim()||!form.name.trim()) { setError("Asset tag and name required"); return; }
    setSaving(true); setError("");
    try {
      const p: any = { ...form, category_id:form.category_id?parseInt(form.category_id):null, branch_id:form.branch_id?parseInt(form.branch_id):null,
        department_id:form.department_id?parseInt(form.department_id):null, purchase_cost:parseFloat(form.purchase_cost)||0,
        current_value:parseFloat(form.current_value)||parseFloat(form.purchase_cost)||0, salvage_value:parseFloat(form.salvage_value)||0,
        useful_life_months:parseInt(form.useful_life_months)||null, purchase_date:form.purchase_date||null,
        depreciation_start_date:form.depreciation_start_date||form.purchase_date||null, warranty_expiry:form.warranty_expiry||null };
      if (editId) p.id = editId;
      const r = await fetch("/api/assets", { method:editId?"PUT":"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(p) });
      const d = await r.json();
      if (d.success) { setShowModal(false); setMsg(editId?"Updated":"Created"); setTimeout(()=>setMsg(""),3000); load(); }
      else setError(d.error);
    } catch { setError("Save failed"); } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    const r = await fetch(`/api/assets?id=${id}`, { method:"DELETE" });
    const d = await r.json();
    if (d.success) { setMsg("Deleted"); setTimeout(()=>setMsg(""),3000); load(); }
    else { setError(d.error); setTimeout(()=>setError(""),4000); }
    setDelConfirm(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><h1 className="page-title">Asset Register</h1><p className="page-subtitle">Complete inventory of all company assets</p></div>
          <button onClick={openCreate} className="btn-primary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Asset
          </button>
        </div>
      </div>
      {msg && <div className="mx-6 mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">{msg}</div>}
      {error && !showModal && <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4">
        <div className="relative flex-1 min-w-[200px] max-w-md"><svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input type="text" placeholder="Search assets..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></div>
        <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
          <option value="">All Status</option>
          {["available","assigned","in_transfer","maintenance","depreciated","scrapped","lost"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
        <select value={filterBranch} onChange={e=>{setFilterBranch(e.target.value);setPage(1);}} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
          <option value="">All Branches</option>
          {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e=>{setFilterCategory(e.target.value);setPage(1);}} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
          <option value="">All Categories</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="px-6 pb-6">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900"><tr>
              {["Asset Tag","Name","Category","Branch","Status","Condition","Value","Assigned To","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading?(<tr><td colSpan={9} className="py-12 text-center"><div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div></td></tr>
              ):assets.length===0?(<tr><td colSpan={9} className="py-12 text-center text-sm text-gray-500">No assets found</td></tr>
              ):assets.map(a=>(
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600 dark:text-blue-400">{a.asset_tag}</td>
                  <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900 dark:text-white">{a.name}</p>{a.serial_number&&<p className="text-xs text-gray-500">SN: {a.serial_number}</p>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.category_name||"—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.branch_name||"—"}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[a.status]||"bg-gray-100 text-gray-600"}`}>{a.status.replace("_"," ")}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${condColors[a.condition_status]||"bg-gray-100 text-gray-600"}`}>{a.condition_status}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">{fmt(a.current_value)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.assigned_to_name||"—"}</td>
                  <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                    <button onClick={()=>openEdit(a)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700" title="Edit"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    {delConfirm===a.id?(<div className="flex gap-1"><button onClick={()=>del(a.id)} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Yes</button><button onClick={()=>setDelConfirm(null)} className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700">No</button></div>):(
                      <button onClick={()=>setDelConfirm(a.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    )}
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

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-gray-800 my-8">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="card-title">{editId?"Edit":"New"} Asset</h2>
              <button onClick={()=>setShowModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto space-y-4 px-6 py-4">
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Tag <span className="text-red-500">*</span></label><input value={form.asset_tag} onChange={e=>setForm({...form,asset_tag:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="AST-0001" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name <span className="text-red-500">*</span></label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label><select value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">—</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Branch</label><select value={form.branch_id} onChange={e=>setForm({...form,branch_id:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">—</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label><select value={form.department_id} onChange={e=>setForm({...form,department_id:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">—</option>{depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label><input value={form.serial_number} onChange={e=>setForm({...form,serial_number:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label><input value={form.model} onChange={e=>setForm({...form,model:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Manufacturer</label><input value={form.manufacturer} onChange={e=>setForm({...form,manufacturer:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date</label><input type="date" value={form.purchase_date} onChange={e=>setForm({...form,purchase_date:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Cost</label><input type="number" step="0.01" value={form.purchase_cost} onChange={e=>setForm({...form,purchase_cost:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Current Value</label><input type="number" step="0.01" value={form.current_value} onChange={e=>setForm({...form,current_value:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Salvage Value</label><input type="number" step="0.01" value={form.salvage_value} onChange={e=>setForm({...form,salvage_value:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Depreciation</label><select value={form.depreciation_method} onChange={e=>setForm({...form,depreciation_method:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="straight_line">Straight Line</option><option value="declining_balance">Declining Balance</option><option value="none">None</option></select></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Useful Life (mo)</label><input type="number" value={form.useful_life_months} onChange={e=>setForm({...form,useful_life_months:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Warranty Expiry</label><input type="date" value={form.warranty_expiry} onChange={e=>setForm({...form,warranty_expiry:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">{["available","assigned","maintenance","depreciated","scrapped"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}</select></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Condition</label><select value={form.condition_status} onChange={e=>setForm({...form,condition_status:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">{["new","good","fair","poor","damaged"].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Barcode</label><input value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button onClick={()=>setShowModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">{saving&&<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}{editId?"Update":"Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
