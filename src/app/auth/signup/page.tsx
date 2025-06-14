
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Key, Info, Smartphone, ShieldAlert, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from "next/navigation";

const GoogleIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2"><path fill="#4285F4" d="M21.35 11.1h-9.03v2.79h5.32c-.25 1.69-1.64 2.99-3.28 2.99-1.96 0-3.55-1.59-3.55-3.55s1.59-3.55 3.55-3.55c.89 0 1.58.32 2.15.83l2.09-2.09C17.02 6.32 15.02 5.5 12.8 5.5c-3.53 0-6.45 2.83-6.45 6.3s2.92 6.3 6.45 6.3c3.24 0 5.67-2.24 5.67-5.82 0-.53-.05-.92-.12-1.28z"></path></svg>;

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" className="w-full text-lg" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating Account...
        </>
      ) : (
        <>
          <UserPlus className="w-5 h-5 mr-2" /> Sign Up
        </>
      )}
    </Button>
  );
}

export default function SignUpPage() {
  const auth = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isLoading) return;
    if (auth.isAuthenticated) {
      router.push('/dashboard');
    }
  }, [auth.isAuthenticated, auth.isLoading, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setFormError("Passwords don't match.");
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      setIsSubmitting(false);
      return;
    }

    const { user: supabaseUser, error: supabaseError, requiresConfirmation } = await auth.registerUserWithEmail(email, password, displayName);
    setIsSubmitting(false);

    if (supabaseUser || (requiresConfirmation && !supabaseError)) { // Success if user object exists or if it requires confirmation without an error
        setSuccessMessage(`Account created for ${email}. Please check your email to confirm your account.`);
        // Reset form fields
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
    } else if (supabaseError) {
      setFormError(supabaseError.message || "Sign up failed. Please try again.");
    }
  };

  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    const { error: googleError } = await auth.loginWithGoogle();
    setIsSubmitting(false); // Typically redirects, but reset state if error
    if (googleError) {
      setFormError(googleError.message || "Google Sign-Up failed.");
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Create Account</CardTitle>
          <CardDescription className="text-md">
            Join TestPrep AI to start generating tests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="displayName"><UserPlus className="inline w-4 h-4 mr-1" /> Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
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
            <div>
              <Label htmlFor="password"><Key className="inline w-4 h-4 mr-1" /> Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="•••••••• (min. 6 characters)"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword"><Key className="inline w-4 h-4 mr-1" /> Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="my-4 p-3 bg-muted/50 border border-dashed rounded-md text-center text-sm text-muted-foreground">
                <ShieldAlert className="w-5 h-5 inline mr-2" />
                reCAPTCHA placeholder (integrate for enhanced security).
            </div>

            <SubmitButton pending={isSubmitting} />
            
            {formError && (
                 <Alert variant="destructive" className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Sign Up Failed</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                </Alert>
            )}
            {successMessage && (
                 <Alert variant="default" className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Account Action</AlertTitle>
                    <AlertDescription>{successMessage} You can <Link href="/auth/signin" className="font-medium text-primary hover:underline">sign in</Link> after confirming your email.</AlertDescription>
                </Alert>
            )}
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or sign up with
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Button variant="outline" onClick={handleGoogleSignUp} disabled={isSubmitting}><GoogleIcon /> Google</Button>
             <Button variant="outline" className="w-full" disabled>
              <Smartphone className="w-5 h-5 mr-2" /> Sign Up with Phone (OTP - Coming Soon)
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/signin" prefetch={false} className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
