"use client";
import React, { useState, useEffect, useCallback } from "react";

interface Branch {
  id: number; name: string; code: string; address: string; city: string; country: string;
  phone: string; email: string; manager_id: number|null; manager_name: string|null; status: string;
}
interface UserOpt { id: number; name: string; email: string; }

const empty = { name:"", code:"", address:"", city:"", country:"", phone:"", email:"", manager_id:"", status:"active" };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [delConfirm, setDelConfirm] = useState<number|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/assets/branches?search=${search}&limit=100`);
      const d = await r.json();
      if (d.success) setBranches(d.data);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/settings/users?limit=100&status=active").then(r=>r.json()).then(d=>{
      if(d.success) setUsers(d.data.map((u:any)=>({id:u.id,name:u.name||`${u.first_name||""} ${u.last_name||""}`.trim(),email:u.email})));
    });
  }, []);

  const openCreate = () => { setEditId(null); setForm(empty); setError(""); setShowModal(true); };
  const openEdit = (b: Branch) => {
    setEditId(b.id);
    setForm({ name:b.name, code:b.code, address:b.address||"", city:b.city||"", country:b.country||"", phone:b.phone||"", email:b.email||"", manager_id:b.manager_id?.toString()||"", status:b.status });
    setError(""); setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()||!form.code.trim()) { setError("Name and code are required"); return; }
    setSaving(true); setError("");
    try {
      const payload: any = { ...form, manager_id: form.manager_id?parseInt(form.manager_id):null };
      if (editId) payload.id = editId;
      const r = await fetch("/api/assets/branches", { method: editId?"PUT":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.success) { setShowModal(false); setMsg(editId?"Branch updated":"Branch created"); setTimeout(()=>setMsg(""),3000); load(); }
      else setError(d.error);
    } catch { setError("Save failed"); } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    const r = await fetch(`/api/assets/branches?id=${id}`, { method:"DELETE" });
    const d = await r.json();
    if (d.success) { setMsg("Branch deleted"); setTimeout(()=>setMsg(""),3000); load(); }
    else { setError(d.error); setTimeout(()=>setError(""),4000); }
    setDelConfirm(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Branches</h1>
            <p className="page-subtitle">Manage company branches and locations</p>
          </div>
          <button onClick={openCreate} className="btn-primary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Branch
          </button>
        </div>
      </div>
      {msg && <div className="mx-6 mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">{msg}</div>}
      {error && !showModal && <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
      <div className="px-6 py-4"><div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" placeholder="Search branches..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
      </div></div>
      <div className="px-6 pb-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {["Code","Branch Name","City / Country","Manager","Status","Actions"].map(h=>(
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div></td></tr>
              ) : branches.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">No branches found</td></tr>
              ) : branches.map(b=>(
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900 dark:text-white">{b.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{b.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{[b.city,b.country].filter(Boolean).join(", ")||"—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{b.manager_name||<span className="text-gray-400 italic">Unassigned</span>}</td>
                  <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${b.status==="active"?"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400":"bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>{b.status}</span></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={()=>openEdit(b)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700" title="Edit">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {delConfirm===b.id?(
                        <div className="flex gap-1"><button onClick={()=>del(b.id)} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Confirm</button><button onClick={()=>setDelConfirm(null)} className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 dark:bg-gray-600 dark:text-gray-200">Cancel</button></div>
                      ):(
                        <button onClick={()=>setDelConfirm(b.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="Delete">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="card-title">{editId?"Edit Branch":"New Branch"}</h2>
              <button onClick={()=>setShowModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="space-y-4 px-6 py-4">
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name <span className="text-red-500">*</span></label><input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Code <span className="text-red-500">*</span></label><input type="text" value={form.code} onChange={e=>setForm({...form,code:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label><input type="text" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">City</label><input type="text" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label><input type="text" value={form.country} onChange={e=>setForm({...form,country:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label><input type="text" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Manager</label><select value={form.manager_id} onChange={e=>setForm({...form,manager_id:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="">— Select —</option>{users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button onClick={()=>setShowModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {editId?"Update":"Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
