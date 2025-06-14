"use client"; // Ensure this is a client component for hooks

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Users, BellRing, Flag, Construction, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

export default function AdminPage() {
  const { isAuthenticated, isLoading, user } = useAuth(); // Assuming user might have a role
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin');
    }
    // Add role check if necessary:
    // if (!isLoading && isAuthenticated && user?.role !== 'admin') {
    //  router.push('/'); // Or a 'not authorized' page
    // }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated /* || user?.role !== 'admin' */) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 w-fit mb-4">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Admin Panel</CardTitle>
          <CardDescription className="text-lg">
            Manage users, content, and system settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 py-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Construction className="w-24 h-24 mb-6" />
            <p className="text-2xl font-semibold mb-2">Feature Under Construction</p>
            <p className="max-w-md mx-auto">
              The admin panel is being developed. Soon, administrators will be able to:
            </p>
            <ul className="list-disc list-inside mt-4 text-left text-muted-foreground space-y-1 max-w-xs mx-auto">
              <li>Moderate content and manage users</li>
              <li>Broadcast custom notifications</li>
              <li>Review flagged items</li>
              <li>Access system analytics</li>
            </ul>
             <p className="mt-4 text-sm">
              This page should be protected and accessible only to authorized administrators.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
