"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { CRForm } from '@/components/change-requests';

export default function NewChangeRequestPage() {
  const router = useRouter();

  const handleSuccess = (cr: any) => {
    router.push(`/changes/${cr.id}`);
  };

  const handleCancel = () => {
    router.push('/changes');
  };

  return (
    <div className="p-6">
      <PageBreadcrumb pageTitle="New Change Request" />
      
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Change Requests
        </button>
      </div>

      <CRForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
