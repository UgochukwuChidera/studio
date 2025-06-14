
"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, Loader2, Share2 } from 'lucide-react';
import type { GeneratePracticeTestOutput, MCQQuestion, DescriptiveQuestion } from '@/ai/flows/generate-practice-test-flow';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import MathRenderer from '@/components/math-renderer';

interface SharedTestDisplayProps {
  testId: string;
}

export default function TestDisplayClient({ testId }: SharedTestDisplayProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [testData, setTestData] = useState<GeneratePracticeTestOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionKey, setCurrentSessionKey] = useState<string | null>(null);


  useEffect(() => {
    const dataSource = searchParams.get('dataSource');
    const key = searchParams.get('key');

    if (dataSource === 'session' && key) {
      try {
        const storedData = sessionStorage.getItem(key);
        if (storedData) {
          const parsedData = JSON.parse(storedData) as GeneratePracticeTestOutput;
          setTestData(parsedData);
          setCurrentSessionKey(key); // Store key to re-use for sharing
        } else {
          setError("Shared test data expired or not found.");
          toast({
            title: "Error Loading Test",
            description: "The shared test data session may have expired.",
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("Failed to parse shared test data from session:", e);
        setError("The shared test link is invalid or corrupted.");
        toast({
          title: "Error Loading Test",
          description: "The test data could not be loaded from the link.",
          variant: "destructive",
        });
      }
    } else {
      // Fallback for old links or direct data (though this should be phased out for large data)
      const dataString = searchParams.get('data');
      if (dataString) {
         try {
            const parsedData = JSON.parse(decodeURIComponent(dataString)) as GeneratePracticeTestOutput;
            setTestData(parsedData);
          } catch (e) {
            console.error("Failed to parse shared test data from URL param:", e);
            setError("The shared test link is invalid or corrupted (URL data).");
             toast({
                title: "Error Loading Test",
                description: "The test data could not be loaded from the URL.",
                variant: "destructive",
            });
          }
      } else {
        setError("No test data found in the link.");
        toast({
            title: "Missing Test Data",
            description: "The shared link does not contain any test information.",
            variant: "destructive",
        });
      }
    }
    setIsLoading(false);
  }, [searchParams, toast]);

  const handleTakeTest = () => {
    if (testData) {
        const mcqQuestions = testData.questions.filter(q => (q as MCQQuestion).options !== undefined);
        
        if (mcqQuestions.length === 0) {
            toast({ 
                title: "No Multiple-Choice Questions", 
                description: "This test does not contain any multiple-choice questions suitable for the Test Arena.", 
                variant: "destructive"
            });
            return;
        }
        
        const mcqTestDataForArena: GeneratePracticeTestOutput = {
            ...testData,
            questions: mcqQuestions
        };
        
        try {
            const newTestKey = `cbt-test-data-${Date.now()}`;
            sessionStorage.setItem(newTestKey, JSON.stringify(mcqTestDataForArena));
            router.push(`/cbt?testDataSource=session&testKey=${newTestKey}`);
        } catch (e) {
            console.error("Error storing test data for CBT in sessionStorage:", e);
            toast({ title: "Error", description: "Could not prepare test for Test Arena. Session storage might be full.", variant: "destructive" });
        }
    }
  };
  
  const handleCopyToClipboard = () => {
    if (typeof window !== "undefined") {
        let shareUrl = window.location.href;
        // If loaded from session, ensure the URL reflects that for persistent sharing
        if (currentSessionKey && !window.location.search.includes('dataSource=session')) {
            shareUrl = `${window.location.origin}/test/${testId}?dataSource=session&key=${currentSessionKey}`;
        }

        navigator.clipboard.writeText(shareUrl).then(() => {
        toast({ title: "Link Copied!", description: "Sharing link copied to clipboard." });
        }).catch(err => {
        toast({ title: "Copy Failed", description: "Could not copy link. Please try manually.", variant: "destructive" });
        });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center p-8">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading shared test...</p>
      </div>
    );
  }

  if (error || !testData) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
        <h2 className="text-2xl font-semibold mb-2">Could Not Load Test</h2>
        <p className="text-muted-foreground mb-6">{error || "An unknown error occurred."}</p>
        <Button asChild>
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }
  
  const hasMcqQuestions = testData.questions.some(q => (q as MCQQuestion).options !== undefined);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-primary mb-1">
                {testData.testTitle || "Shared Practice Test"}
              </CardTitle>
              <CardDescription>
                You've received a shared test. Review the questions below or start the test if applicable.
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={handleCopyToClipboard} aria-label="Copy share link">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <h3 className="text-xl font-semibold">Test Questions:</h3>
          {testData.questions.length === 0 ? (
            <p className="text-muted-foreground">This test has no questions.</p>
          ) : (
            <ul className="space-y-4">
              {testData.questions.map((q, index) => (
                <li key={index} className="p-4 rounded-md bg-muted/50 border">
                  <p className="font-medium text-foreground mb-2">Question {index + 1}: <MathRenderer content={q.questionText} /></p>
                  {(q as MCQQuestion).options ? (
                    <>
                      <ul className="space-y-1 pl-4 mb-2">
                        {(q as MCQQuestion).options.map((opt, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            {String.fromCharCode(65 + i)}. <MathRenderer content={opt} />
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        Correct Answer: {String.fromCharCode(65 + (q as MCQQuestion).correctOptionIndex)}. <MathRenderer content={(q as MCQQuestion).options[(q as MCQQuestion).correctOptionIndex]} />
                      </p>
                      {(q as MCQQuestion).explanation && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Explanation: <MathRenderer content={(q as MCQQuestion).explanation!} />
                        </p>
                      )}
                       {(q as MCQQuestion).bloomLevel && (
                          <p className="text-xs text-muted-foreground mt-1">
                              Bloom's Level: {(q as MCQQuestion).bloomLevel}
                          </p>
                       )}
                    </>
                  ) : (
                    <>
                        <p className="text-sm text-muted-foreground italic mb-1">(Descriptive question)</p>
                        {(q as DescriptiveQuestion).bloomLevel && (
                            <p className="text-xs text-muted-foreground">
                                Bloom's Level: {(q as DescriptiveQuestion).bloomLevel}
                            </p>
                        )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
          <Button onClick={handleTakeTest} size="lg" disabled={!hasMcqQuestions}>
            <FileText className="mr-2 h-5 w-5"/> Take This Test
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/ai-content-generator">Generate Your Own Content</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

