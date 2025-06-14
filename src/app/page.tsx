
"use client";

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Lightbulb, TestTubeDiagonal, ArrowRight, LogIn, UserPlus, Loader2 } from "lucide-react"; // Added Loader2
import Link from "next/link";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
// import Image from 'next/image'; // Image component not used currently
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; // For cn utility if Loader2 needs it

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard'); 
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loader only if actively trying to determine auth state and user is potentially authenticated
  // or if it's the initial load and we don't know the auth state yet.
  // If not authenticated and not loading, it means we should show the landing page.
  if (isLoading && (isAuthenticated || typeof isAuthenticated === 'undefined')) { 
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If authenticated and not loading, the useEffect above will handle redirect.
  // If not authenticated and not loading, render the landing page.
  if (isAuthenticated && !isLoading) {
      // This case should ideally be handled by the redirect in useEffect,
      // but as a fallback, show loader to prevent flashing landing page.
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/10 text-foreground">
      <header className="py-6 px-4 sm:px-8 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          <h1 className="text-2xl font-bold text-primary">TestPrep AI</h1>
        </Link>
        <div className="space-x-2">
          <Button variant="outline" asChild>
            <Link href="/auth/signin" className="gap-2">
              <LogIn size={16}/> Sign In
            </Link>
          </Button>
          <Button variant="default" asChild>
            <Link href="/auth/signup" className="gap-2">
              <UserPlus size={16}/> Sign Up
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 sm:py-20">
        <Badge variant="secondary" className="mb-6 py-1.5 px-4 text-sm rounded-full">
          <Zap className="w-4 h-4 mr-2 text-primary" /> AI-Powered Test Preparation Platform
        </Badge>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
          Ace Your Exams with TestPrep AI
        </h1>
        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10">
          Generate personalized practice tests, flashcards, and summary notes from any study material. 
          Elevate your learning and conquer your exams with intelligent preparation.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" asChild className="text-lg py-7 px-8">
            <Link href="/auth/signup" className="gap-2">
              Get Started for Free <ArrowRight size={20}/>
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-lg py-7 px-8">
            <Link href="/#features">Learn More</Link>
          </Button>
        </div>
      </main>

      <section id="features" className="py-16 sm:py-24 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-primary">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-10 h-10 text-primary" />}
              title="AI Content Generation"
              description="Upload your notes or provide a topic to instantly create tests, flashcards, and summaries."
            />
            <FeatureCard
              icon={<TestTubeDiagonal className="w-10 h-10 text-primary" />}
              title="Interactive Test Arena"
              description="Take timed MCQ tests, get instant scores, and review your performance."
            />
            <FeatureCard
              icon={<Lightbulb className="w-10 h-10 text-primary" />}
              title="Personalized Study"
              description="Focus on your weak areas with AI-driven insights and adaptive learning tools (coming soon)."
            />
          </div>
        </div>
      </section>
      
      <section className="py-16 sm:py-24">
         <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-primary">Join Thousands of Students</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                Ready to transform your study habits and achieve academic success?
            </p>
             <Button size="lg" asChild className="text-lg py-7 px-8">
                <Link href="/auth/signup">Sign Up Now & Start Prepping</Link>
            </Button>
         </div>
      </section>

      <footer className="py-8 border-t border-border text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} TestPrep AI. All rights reserved.</p>
        <div className="mt-2 space-x-4">
            <Link href="/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-primary">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <Card className="text-center hover:shadow-xl transition-shadow bg-card">
    <CardHeader className="items-center">
      <div className="p-4 bg-primary/10 rounded-full mb-3 w-fit">
        {icon}
      </div>
      <CardTitle className="text-xl">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

// Loader2 component definition if it's not globally available
// const Loader2 = ({ className }: { className?: string }) => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     width="24"
//     height="24"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     className={cn("animate-spin", className)}
//   >
//     <path d="M21 12a9 9 0 1 1-6.219-8.56" />
//   </svg>
// );

