"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { EnhancedProjectDashboard } from '@/components/projects';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div className="p-6">
      <EnhancedProjectDashboard projectId={projectId} />
    </div>
  );
}
