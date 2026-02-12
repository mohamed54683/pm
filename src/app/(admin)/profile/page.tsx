"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/button/Button";

interface UserProfile {
  id: number;
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  phone: string;
  job_title: string;
  department: string;
  timezone: string;
  locale: string;
  date_format: string;
  time_format: string;
  status: string;
  last_login_at: string;
  created_at: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    phone: "",
    job_title: "",
    department: "",
    timezone: "UTC",
    locale: "en",
    date_format: "YYYY-MM-DD",
    time_format: "24h",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/profile", { credentials: "include" });
      const result = await response.json();
      
      if (result.success && result.data) {
        setProfile(result.data);
        setFormData({
          first_name: result.data.first_name || "",
          last_name: result.data.last_name || "",
          display_name: result.data.display_name || "",
          phone: result.data.phone || "",
          job_title: result.data.job_title || "",
          department: result.data.department || "",
          timezone: result.data.timezone || "UTC",
          locale: result.data.locale || "en",
          date_format: result.data.date_format || "YYYY-MM-DD",
          time_format: result.data.time_format || "24h",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setEditing(false);
        loadProfile();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (!profile) return "?";
    return ((profile.first_name?.charAt(0) || "") + (profile.last_name?.charAt(0) || "")).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">
              Manage your account settings and preferences
            </p>
          </div>
          {!editing ? (
            <Button onClick={() => setEditing(true)}>Edit Profile</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEditing(false); loadProfile(); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="text-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="h-24 w-24 rounded-full mx-auto object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-full mx-auto flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500 text-3xl font-bold text-white">
                  {getInitials()}
                </div>
              )}
              <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                {profile?.first_name} {profile?.last_name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {profile?.job_title || "Team Member"}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {profile?.email}
              </p>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">🏢</span>
                <span className="text-gray-600 dark:text-gray-300">
                  {profile?.department || "No department"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">📱</span>
                <span className="text-gray-600 dark:text-gray-300">
                  {profile?.phone || "No phone"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">🌍</span>
                <span className="text-gray-600 dark:text-gray-300">
                  {profile?.timezone || "UTC"}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-6">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  disabled={!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="form-label">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  disabled={!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="form-label">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  disabled={!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="form-label">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="form-label">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  disabled={!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="form-label">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  disabled={!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 dark:text-white mt-8 mb-6">Preferences</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  disabled={!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                  <option value="UTC">UTC</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (UTC+3)</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                </select>
              </div>
              <div>
                <label className="form-label">
                  Language
                </label>
                <select
                  value={formData.locale}
                  onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                  disabled={!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div>
                <label className="form-label">
                  Date Format
                </label>
                <select
                  value={formData.date_format}
                  onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
                  disabled={!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>
              <div>
                <label className="form-label">
                  Time Format
                </label>
                <select
                  value={formData.time_format}
                  onChange={(e) => setFormData({ ...formData, time_format: e.target.value })}
                  disabled={!editing}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                  <option value="24h">24 Hour</option>
                  <option value="12h">12 Hour (AM/PM)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Account Status</span>
              <p className="mt-1 font-medium text-green-600 dark:text-green-400 capitalize">
                {profile?.status || "Active"}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Member Since</span>
              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Last Login</span>
              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString() : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
