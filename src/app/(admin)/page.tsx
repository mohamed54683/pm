"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="relative mx-auto h-16 w-16">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Dashboard...</p>
      </div>
    </div>
  );
}
