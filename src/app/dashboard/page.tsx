
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  History,
  CalendarDays,
  Target,
  Download,
  Lock,
  Construction,
  HelpCircle,
  Loader2,
  Zap,
  TrendingUp,
  BarChart3,
  LineChart
} from "lucide-react";
import Link from "next/link";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';


type UserTier = "free" | "basic" | "pro";

interface AnalyticsFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  requiredTier: UserTier;
  isImplemented: boolean;
  link?: string;
  actionText?: string;
  dataAiHint: string;
  proOnly?: boolean;
  basicOnly?: boolean;
}

// Updated and reordered analytics features
const allAnalyticsFeatures: AnalyticsFeature[] = [
  {
    id: "tests-taken-daily",
    title: "Tests Taken Per Day (Pro)",
    description: "Track your daily test completion volume with a bar chart visualization.",
    icon: BarChart3,
    requiredTier: "pro",
    isImplemented: false,
    link: "/dashboard#tests-daily", // Placeholder link
    actionText: "View Daily Volume",
    dataAiHint: "daily tests chart",
    proOnly: true,
  },
  {
    id: "average-daily-score",
    title: "Average Daily Score (Pro)",
    description: "Monitor your average score trend on a daily basis. View as line or bar chart.",
    icon: LineChart,
    requiredTier: "pro",
    isImplemented: false,
    link: "/dashboard#score-daily", // Placeholder link
    actionText: "View Daily Trend",
    dataAiHint: "daily score chart",
    proOnly: true,
  },
  {
    id: "rolling-average-score",
    title: "Rolling Test Average (Pro)",
    description: "See your performance consistency with a rolling average score over recent tests.",
    icon: TrendingUp,
    requiredTier: "pro",
    isImplemented: false,
    link: "/dashboard#rolling-average", // Placeholder link
    actionText: "View Rolling Average",
    dataAiHint: "score trendline analysis",
    proOnly: true,
  },
  {
    id: "heatmaps",
    title: "Performance Heatmaps (Pro)",
    description: "Visualize your test activity and performance consistency with daily/weekly heatmaps.",
    icon: CalendarDays,
    requiredTier: "pro",
    isImplemented: false,
    link: "/my-tests/test-history#heatmaps",
    actionText: "View Heatmaps",
    dataAiHint: "calendar activity",
    proOnly: true,
  },
  {
    id: "weakness-detection",
    title: "AI Weakness Detection (Pro)",
    description: "Our AI analyzes your results to identify weak areas and suggest relevant study resources.",
    icon: Target,
    requiredTier: "pro",
    isImplemented: false,
    link: "/my-tests/test-history#weakness-detection",
    actionText: "Analyze Weaknesses",
    dataAiHint: "target improvement areas",
    proOnly: true,
  },
  {
    id: "data-export",
    title: "Export Analytics (Pro)",
    description: "Download your detailed performance data as CSV or Excel files for offline analysis.",
    icon: Download,
    requiredTier: "pro",
    isImplemented: false,
    link: "/my-tests/test-history#export",
    actionText: "Export Data",
    dataAiHint: "download spreadsheet data",
    proOnly: true,
  },
  {
    id: "average-score",
    title: "Overall Average Score",
    description: "Track your overall average test score across all attempts.",
    icon: TrendingUp,
    requiredTier: "free",
    isImplemented: false, 
    link: "/my-tests/test-history",
    actionText: "View Progress",
    dataAiHint: "graph score trend",
  },
  {
    id: "test-history",
    title: "Test History",
    description: "Review all your past tests, attempts, and scores in detail.",
    icon: History,
    requiredTier: "free",
    isImplemented: true, 
    link: "/my-tests/test-history",
    actionText: "View History",
    dataAiHint: "list past tests",
  },
   {
    id: "priority-support",
    title: "Priority Support (Basic+)",
    description: "Get faster responses from our support team when you need help.",
    icon: HelpCircle,
    requiredTier: "basic",
    isImplemented: false,
    link: "/settings#support",
    actionText: "Contact Support",
    dataAiHint: "customer service help",
    basicOnly: true,
  },
];

const tiers = {
  free: { name: "Free", testLimit: "100 tests/month", price: "" },
  basic: { name: "Basic", testLimit: "1,000 tests/month", price: "₦5,000/month" },
  pro: { name: "Pro", testLimit: "Unlimited tests", price: "₦20,000/month" },
};

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const [currentUserTier, setCurrentUserTier] = useState<UserTier>("free");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin');
    }
    if (user && (user as any).subscriptionTier) {
        setCurrentUserTier((user as any).subscriptionTier);
    } else if (user) {
        // If subscriptionTier is not on user, default to free
        // This could happen if the Firestore document isn't created yet or lacks the field
        setCurrentUserTier("free");
    }
  }, [isLoading, isAuthenticated, router, user]);


  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const availableFeatures = allAnalyticsFeatures.filter(feature => {
    if (currentUserTier === "pro") return true;
    if (currentUserTier === "basic") return feature.requiredTier === "free" || feature.requiredTier === "basic";
    return feature.requiredTier === "free";
  });

  const featuresToUpgradeFor = allAnalyticsFeatures.filter(feature =>
    !availableFeatures.find(af => af.id === feature.id)
  );

  const nextTier = currentUserTier === "free" ? "basic" : (currentUserTier === "basic" ? "pro" : "pro");
  const upgradePromptFeature = featuresToUpgradeFor.find(f => f.requiredTier === nextTier) || featuresToUpgradeFor.find(f => f.requiredTier === "pro");


  return (
    <div className="container mx-auto py-8 px-4">
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
          Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground">
          Your intelligent partner for acing exams. Here's your performance snapshot.
        </p>
         <div className="mt-2 text-sm text-muted-foreground">
          Current Tier: <span className="inline-block">
            <Badge variant={currentUserTier === "pro" ? "default" : (currentUserTier === "basic" ? "secondary" : "outline")} className="ml-1">
              {tiers[currentUserTier].name} ({tiers[currentUserTier].testLimit})
            </Badge>
            </span>
        </div>
      </header>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-semibold">Performance Analytics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableFeatures.map((feature) => (
            <AnalyticsCard
              key={feature.id}
              feature={feature}
              currentUserTier={currentUserTier}
            />
          ))}
           {currentUserTier !== "pro" && upgradePromptFeature && (
            <Card className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl bg-primary/5 border-primary/20">
              <CardHeader className="items-center p-6 text-center">
                <div className="p-3 mb-3 rounded-full bg-primary/10 text-primary">
                  <upgradePromptFeature.icon className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl text-primary">Unlock: {upgradePromptFeature.title.replace("(Pro)", "").replace("(Basic+)", "").trim()}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-6 text-center">
                <CardDescription>
                  Upgrade to {tiers[nextTier].name} ({tiers[nextTier].price}) to access {upgradePromptFeature.description.toLowerCase().replace("(pro)", "").replace("(basic)","").trim()} and more!
                </CardDescription>
              </CardContent>
              <CardFooter className="p-6 pt-0 text-center">
                 <Button asChild className="w-full" variant="default">
                  <Link href="/settings#billing">Upgrade to {tiers[nextTier].name}</Link>
                </Button>
              </CardFooter>
            </Card>
           )}
        </div>
      </section>

      <section className="mt-16 text-center py-10 bg-muted/50 rounded-lg">
        <h2 className="text-3xl font-semibold mb-4">Ready to Prepare?</h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Generate personalized tests, flashcards, and notes from your study materials using our AI tools.
        </p>
        <Button size="lg" asChild variant="default" className="gap-2">
          <Link href="/ai-content-generator"><Zap />Go to AI Content Generator</Link>
        </Button>
      </section>
    </div>
  );
}

interface AnalyticsCardProps {
  feature: AnalyticsFeature;
  currentUserTier: UserTier;
}

function AnalyticsCard({ feature, currentUserTier }: AnalyticsCardProps) {
  const { title, description, icon: Icon, requiredTier, isImplemented, link, actionText, proOnly, basicOnly, dataAiHint } = feature;

  const canAccess =
    currentUserTier === "pro" ||
    (currentUserTier === "basic" && (requiredTier === "free" || requiredTier === "basic")) ||
    (currentUserTier === "free" && requiredTier === "free");

  let badgeText = "";
  if (proOnly && requiredTier === "pro") badgeText = "Pro Feature";
  else if (basicOnly && requiredTier === "basic") badgeText = "Basic+ Feature";


  return (
    <Card
      className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl"
      data-ai-hint={dataAiHint}
    >
      <CardHeader className="items-center p-6 text-center">
        <div className={`p-3 mb-3 rounded-full ${canAccess ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="w-8 h-8" />
        </div>
        <CardTitle className="text-xl">{title.replace("(Pro)", "").replace("(Basic+)", "").trim()}</CardTitle>
        {badgeText && <Badge variant="secondary" className="mt-1">{badgeText}</Badge>}
      </CardHeader>
      <CardContent className="flex-grow p-6 text-center">
        <CardDescription>{description}</CardDescription>
      </CardContent>
      <CardFooter className="p-6 pt-0 text-center">
        {!isImplemented ? (
          <div className="w-full text-center">
            <Badge variant="outline" className="flex items-center justify-center gap-2 py-2 px-3 text-sm">
              <Construction className="w-4 h-4" /> Coming Soon
            </Badge>
          </div>
        ) : canAccess ? (
          <Button asChild variant="outline" className="w-full">
            <Link href={link || "#"}>{actionText || "Learn More"}</Link>
          </Button>
        ) : (
          <Button asChild variant="default" className="w-full">
            <Link href="/settings#billing">
              <Lock className="w-4 h-4 mr-2" /> Upgrade to {tiers[requiredTier].name}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}


    