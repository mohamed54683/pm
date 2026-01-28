"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface Folder {
  id: number;
  uuid: string;
  name: string;
  path: string;
  parent_id: number | null;
  description: string;
}

interface Document {
  id: number;
  uuid: string;
  name: string;
  file_name: string;
  file_type: string;
  file_size: number;
  version: string;
  status: string;
  folder_id: number | null;
  uploaded_by_id: number;
  uploaded_by_first_name: string;
  uploaded_by_last_name: string;
  created_at: string;
  updated_at: string;
}

interface Breadcrumb {
  id: number;
  name: string;
}

const fileTypeIcons: Record<string, string> = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  xls: '📊',
  xlsx: '📊',
  ppt: '📽️',
  pptx: '📽️',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
  gif: '🖼️',
  zip: '📦',
  rar: '📦',
  txt: '📃',
  csv: '📑',
  default: '📁',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  archived: 'bg-blue-100 text-blue-700',
  obsolete: 'bg-red-100 text-red-700',
};

export default function DocumentsPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (currentFolder) params.set('folderId', currentFolder.toString());
      if (searchTerm) params.set('search', searchTerm);
      
      const response = await fetch(`/api/documents?${params}`, { credentials: 'include' });
      const result = await response.json();
      
      if (result.success) {
        setFolders(result.data.folders || []);
        setDocuments(result.data.documents || []);
        setBreadcrumbs(result.data.breadcrumbs || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    const ext = fileType.toLowerCase().replace('.', '');
    return fileTypeIcons[ext] || fileTypeIcons.default;
  };

  const handleFolderClick = (folderId: number) => {
    setCurrentFolder(folderId);
  };

  const handleBreadcrumbClick = (folderId: number | null) => {
    setCurrentFolder(folderId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments();
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'folder',
          name: newFolderName,
          parent_id: currentFolder
        })
      });
      const result = await response.json();
      if (result.success) {
        setShowFolderModal(false);
        setNewFolderName('');
        loadDocuments();
      } else {
        alert(result.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Project documentation and files
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFolderModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              New Folder
            </button>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm">
            <button
              onClick={() => handleBreadcrumbClick(null)}
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Root
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <span className="text-gray-400">/</span>
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-gray-700 dark:text-gray-300">{crumb.name}</span>
                ) : (
                  <button
                    onClick={() => handleBreadcrumbClick(crumb.id)}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {crumb.name}
                  </button>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </form>

            {/* View Toggle */}
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              >
                <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              >
                <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
        ) : folders.length === 0 && documents.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm dark:bg-gray-800">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="mt-4 text-gray-500 dark:text-gray-400">This folder is empty</p>
            <p className="text-sm text-gray-400">Upload files or create folders to get started</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {/* Folders */}
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleFolderClick(folder.id)}
                className="cursor-pointer rounded-xl bg-white p-4 text-center shadow-sm transition-all hover:shadow-md dark:bg-gray-800"
              >
                <span className="text-4xl">📁</span>
                <p className="mt-2 truncate font-medium text-gray-900 dark:text-white">{folder.name}</p>
                <p className="text-xs text-gray-500">Folder</p>
              </div>
            ))}

            {/* Documents */}
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="cursor-pointer rounded-xl bg-white p-4 text-center shadow-sm transition-all hover:shadow-md dark:bg-gray-800"
              >
                <span className="text-4xl">{getFileIcon(doc.file_type)}</span>
                <p className="mt-2 truncate font-medium text-gray-900 dark:text-white" title={doc.name}>
                  {doc.name}
                </p>
                <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${statusColors[doc.status]}`}>
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Uploaded By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Folders */}
                {folders.map((folder) => (
                  <tr
                    key={`folder-${folder.id}`}
                    onClick={() => handleFolderClick(folder.id)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📁</span>
                        <span className="font-medium text-gray-900 dark:text-white">{folder.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">Folder</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">—</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">—</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">—</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">—</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">—</td>
                  </tr>
                ))}
                
                {/* Documents */}
                {documents.map((doc) => (
                  <tr
                    key={`doc-${doc.id}`}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(doc.file_type)}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{doc.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 uppercase">{doc.file_type}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatFileSize(doc.file_size)}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[doc.status]}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{doc.version}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {doc.uploaded_by_first_name} {doc.uploaded_by_last_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      <Modal isOpen={showFolderModal} onClose={() => setShowFolderModal(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Folder</h2>
          <form onSubmit={handleCreateFolder}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Folder Name *</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Enter folder name"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-4">
              <Button variant="outline" onClick={() => setShowFolderModal(false)} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newFolderName.trim()}>
                {creating ? 'Creating...' : 'Create Folder'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Upload Document</h2>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              File upload is currently in development
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Documents can be added via the API
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 mt-4">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
