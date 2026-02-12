"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { CRForm } from '@/components/change-requests';

export default function EditChangeRequestPage() {
  const router = useRouter();
  const params = useParams();
  const crId = params.id as string;
  
  const [crData, setCrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCR = async () => {
      try {
        const response = await fetch(`/api/change-requests/${crId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch change request');
        }
        const data = await response.json();
        setCrData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (crId) {
      fetchCR();
    }
  }, [crId]);

  const handleSuccess = (cr: any) => {
    router.push(`/changes/${cr.id}`);
  };

  const handleCancel = () => {
    router.push(`/changes/${crId}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageBreadcrumb pageTitle="Edit Change Request" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <PageBreadcrumb pageTitle="Edit Change Request" />
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => router.push('/changes')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Change Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageBreadcrumb pageTitle="Edit Change Request" />
      
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Change Request
        </button>
      </div>

      <CRForm
        initialData={crData}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
