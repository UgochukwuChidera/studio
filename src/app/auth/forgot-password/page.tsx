
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Send, Info, Construction, ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

function SubmitButton({ pending }: { pending: boolean}) {
  return (
    <Button type="submit" className="w-full text-lg" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...
        </>
      ) : (
        <>
          <Send className="w-5 h-5 mr-2" /> Send Reset Link
        </>
      )}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  useEffect(() => {
    if (auth.isLoading) return;

    if (auth.isAuthenticated) {
      router.push('/dashboard');
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    if (!email) {
      setFormError("Email is required.");
      setIsSubmitting(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        setFormError("Invalid email address.");
        setIsSubmitting(false);
        return;
    }

    const { error: supabaseError } = await auth.sendPasswordReset(email);
    setIsSubmitting(false);
    if (!supabaseError) {
      setSuccessMessage("If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).");
    } else {
      setFormError(supabaseError.message || "Failed to send password reset email.");
    }
  };

  if (auth.isLoading || auth.isAuthenticated) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4">
             <Mail className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Forgot Password?</CardTitle>
          <CardDescription className="text-md">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email"><Mail className="inline w-4 h-4 mr-1" /> Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="my-4 p-3 bg-muted/50 border border-dashed rounded-md text-center text-sm text-muted-foreground">
                <ShieldAlert className="w-5 h-5 inline mr-2" />
                reCAPTCHA placeholder (integrate with Supabase).
            </div>

            <SubmitButton pending={isSubmitting} />
            {formError && (
              <Alert variant="destructive" className="mt-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
             {successMessage && !formError && (
              <Alert variant="default" className="mt-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Request Sent</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
          </form>
          <Alert variant="default" className="mt-4">
            <Construction className="h-4 w-4" />
            <AlertTitle>Password Reset Flow</AlertTitle>
            <AlertDescription>
              This uses Supabase Auth to send a password reset email. Email verification for new accounts is also typically handled by Supabase.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="text-center text-sm">
          <p className="text-muted-foreground">
            Remember your password?{" "}
            <Link href="/auth/signin" prefetch={false} className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
