
"use client";

import React, { useEffect } from 'react';
import WhiteboardEmbed from '@/components/tools/whiteboard-embed';
import { useAuth } from '@/contexts/auth-context'; 
import { useRouter } from 'next/navigation'; 
import { Loader2 } from 'lucide-react';

export default function WhiteboardPage() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/auth/signin');
    }
  }, [authIsLoading, isAuthenticated, router]);

  if (authIsLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <WhiteboardEmbed />
    </div>
  );
}
