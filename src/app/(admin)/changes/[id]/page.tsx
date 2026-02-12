"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { CRDetail } from '@/components/change-requests';

export default function ChangeRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const crId = params.id as string;

  const handleBack = () => {
    router.push('/changes');
  };

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="p-6">
      <PageBreadcrumb pageTitle="Change Request Details" />
      
      <CRDetail
        crId={crId}
        onBack={handleBack}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
