"use client"; // Ensure this is a client component for hooks

import CBTClientPage from './cbt-client';
import type { Metadata } from 'next';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// export const metadata: Metadata = { // Metadata cannot be used in client components directly. 
// Move to a parent server component or handle document head in CBTClientPage if needed.
//   title: 'Test Arena - Select or Start Test - TestPrep AI',
//   description: 'Choose a test from the question bank, or continue a test from AI Content Generator.',
// };

export default function CBTPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") { // Ensure this runs only on client
        document.title = 'Test Arena - TestPrep AI'; // Set title dynamically
    }
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  return <CBTClientPage />;
}
