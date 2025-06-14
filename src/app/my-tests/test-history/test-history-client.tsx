
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert as ShadcnAlert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { TestScore, SavedContentItem } from '@/app/ai-content-generator/ai-content-generator-client';
import type { MCQQuestion, TestQuestion } from '@/ai/flows';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useDebounce } from '@/hooks/use-debounce';
import MathRenderer from '@/components/math-renderer';
import { supabase } from '@/lib/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Loader2, History, Search, FileText, Upload, Download, Trash2, View, CalendarDays, Percent, CheckCircle as ShadcnCheckCircle, XCircle as ShadcnXIcon, ServerIcon as Server } from 'lucide-react';


export default function TestHistoryClient() {
  const [testHistory, setTestHistory] = useState<SavedContentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedResultForView, setSelectedResultForView] = useState<SavedContentItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authIsLoading, session } = useAuth();

  const formatTime = (seconds?: number): string => {
    if (seconds === undefined || seconds === null) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadTestHistoryFromCloud = useCallback(async (isRefresh = false) => {
    if (!user || !session) {
      setIsLoadingItems(false); setIsLoadingPage(false);
      return;
    }
    setIsLoadingItems(true);
    if (isRefresh) {
      toast({ title: "Refreshing History...", description: "Fetching latest test results.", duration: 2000 });
    }

    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('getTestHistory');
      if (functionError) {
        const errDesc = functionError instanceof FunctionsHttpError ? (await functionError.context.json().catch(() => ({})))?.error || functionError.message : functionError.message;
        throw new Error(errDesc || "Cloud fetch failed.");
      }
      if (functionData && functionData.success && Array.isArray(functionData.history)) {
        const cloudHistory: SavedContentItem[] = functionData.history.map((h: any) => ({
          id: h.id, type: 'test_result', title: h.test_title,
          content: { // Reconstruct TestScore object
            testTitle: h.test_title,
            originalTestId: h.original_test_id,
            originalTestType: h.original_test_type,
            score: h.score,
            totalQuestions: h.total_questions,
            percentage: h.percentage,
            answers: h.answers, // Assume this is already in correct format from DB
            timeTakenSeconds: h.time_taken_seconds,
          } as TestScore,
          savedAt: h.completed_at || h.created_at || new Date().toISOString(), // Use completed_at
          user_id: h.user_id,
          isLocal: false, cloudId: h.id,
        }));
        setTestHistory(cloudHistory.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
        toast({ title: "Test History Loaded", description: `${cloudHistory.length} result(s) fetched.`, variant: "default", duration: 3000 });
      } else {
        throw new Error(functionData?.error || "Failed to retrieve history or unexpected data.");
      }
    } catch (error: any) {
      console.error("Error fetching test history:", error);
      toast({ title: "Cloud Sync Error", description: `Could not fetch history: ${error.message}.`, variant: "destructive", duration: 5000 });
    } finally {
      setIsLoadingItems(false); setIsLoadingPage(false);
    }
  }, [user, session, toast]);

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/auth/signin'); setIsLoadingPage(false);
    } else if (isAuthenticated && user?.id) {
      loadTestHistoryFromCloud();
    } else if (!authIsLoading) {
      setIsLoadingPage(false);
    }
  }, [isAuthenticated, authIsLoading, user?.id, loadTestHistoryFromCloud, router]);

  const filteredHistory = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return testHistory;
    const term = debouncedSearchTerm.toLowerCase();
    return testHistory.filter(item =>
      item.title.toLowerCase().includes(term) ||
      ((item.content as TestScore)?.originalTestType || '').toLowerCase().includes(term)
    );
  }, [testHistory, debouncedSearchTerm]);

  const handleDeleteResult = async () => {
    if (!itemToDeleteId) return;
    setIsDeleting(true);
    const itemToDelete = testHistory.find(item => item.id === itemToDeleteId);
    toast({ title: "Deleting...", description: `Attempting to delete "${itemToDelete?.title || 'result'}".`, duration: 2000 });

    try {
      // Assuming a 'deleteTestResult' Edge Function or direct DB operation with RLS
      // For now, this example might not have a dedicated EF for deleting test results.
      // RLS on test_results should allow user to delete their own.
      const { error: deleteError } = await supabase
        .from('test_results')
        .delete()
        .eq('id', itemToDeleteId)
        .eq('user_id', user!.id); // Ensure user only deletes their own, though RLS should also enforce

      if (deleteError) throw deleteError;

      toast({ title: "Result Deleted", description: `"${itemToDelete?.title || 'Result'}" removed from history.` });
      setTestHistory(prev => prev.filter(item => item.id !== itemToDeleteId));
      if (selectedResultForView?.id === itemToDeleteId) {
        setIsViewModalOpen(false); setSelectedResultForView(null);
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message || "Could not delete result.", variant: "destructive" });
    } finally {
      setIsDeleting(false); setItemToDeleteId(null);
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full w-full text-center py-10 bg-muted/30 rounded-lg border border-dashed">
      <History className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {debouncedSearchTerm.trim() ? 'No matching test results found' : 'Your test history is empty'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {debouncedSearchTerm.trim() ? "Try adjusting your search." : "Take some tests in the Test Arena to see your results here!"}
      </p>
      <Button onClick={() => router.push('/cbt')} variant="default" size="sm">Go to Test Arena</Button>
    </div>
  );

  const renderResultCard = (item: SavedContentItem) => {
    const testScore = item.content as TestScore;
    return (
      <Card key={item.id} className="w-full hover:shadow-md transition-shadow">
        <CardHeader className="p-4">
          <CardTitle className="flex items-start gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <span className="truncate flex-1">{item.title}</span>
            <Badge variant={item.isLocal ? "secondary" : "outline"} className={`text-xs ml-auto shrink-0 ${item.isLocal ? 'border-blue-500 text-blue-600' : 'border-green-500 text-green-600'}`}>{item.isLocal ? "Local" : "Cloud"}</Badge>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            <div className="flex items-center gap-1.5"><CalendarDays size={13}/>Completed: {new Date(item.savedAt).toLocaleDateString()}</div>
            <div className="flex items-center gap-1.5 mt-0.5"><Percent size={13}/>Score: {testScore.percentage?.toFixed(1)}% ({testScore.score}/{testScore.totalQuestions})</div>
            {testScore.originalTestType && <div className="mt-0.5">Type: <span className="capitalize">{testScore.originalTestType.replace(/([A-Z])/g, ' $1').trim()}</span></div>}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-between p-4 pt-0">
          <Button variant="outline" size="sm" onClick={() => { setSelectedResultForView(item); setIsViewModalOpen(true); }} className="gap-1.5">
            <View size={16} /> Details
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="gap-1.5"><Trash2 size={16}/>Delete</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete Test Result?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => setItemToDeleteId(item.id)} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting && itemToDeleteId === item.id}>
                  {isDeleting && itemToDeleteId === item.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    );
  };
  useEffect(() => { // Effect to call actual delete when itemToDeleteId is set
    if (itemToDeleteId && !isDeleting) {
      handleDeleteResult();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemToDeleteId]);


  if (authIsLoading || isLoadingPage) {
    return <div className="flex items-center justify-center min-h-screen w-full bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col w-full h-full">
      <header className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><History className="w-6 h-6"/>Test History</h1>
            <p className="text-sm text-muted-foreground mt-1">Review your past test attempts and results.</p>
          </div>
           <Button variant="outline" size="sm" onClick={() => loadTestHistoryFromCloud(true)} disabled={isLoadingItems} className="gap-1.5">
              {isLoadingItems ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw size={16}/>}
              Refresh History
            </Button>
        </div>
      </header>
      <div className="w-full px-4 sm:px-6 lg:px-8 mt-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search test history by title or type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full h-10"/>
        </div>
      </div>
      <main className="flex-1 w-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoadingItems ? <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
          : filteredHistory.length === 0 ? renderEmptyState()
          : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">{filteredHistory.map(renderResultCard)}</div>
        }
      </main>
      <Dialog open={isViewModalOpen} onOpenChange={(isOpen) => { setIsViewModalOpen(isOpen); if (!isOpen) setSelectedResultForView(null); }}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0">
          {selectedResultForView && selectedResultForView.content && typeof selectedResultForView.content === 'object' && (
            <>
              <DialogHeader className="p-6 pb-2 text-center border-b">
                <DialogTitle>{(selectedResultForView.content as TestScore).testTitle || selectedResultForView.title}</DialogTitle>
                <DialogDescription>Test taken on {new Date(selectedResultForView.savedAt).toLocaleString()}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 overflow-y-auto px-6 max-h-[calc(90vh-250px)]">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <Card><CardHeader className="p-3"><CardTitle className="text-sm font-medium">Score</CardTitle><CardDescription className="text-2xl font-bold">{(selectedResultForView.content as TestScore).score}/{(selectedResultForView.content as TestScore).totalQuestions}</CardDescription></CardHeader></Card>
                    <Card><CardHeader className="p-3"><CardTitle className="text-sm font-medium">Percentage</CardTitle><CardDescription className="text-2xl font-bold">{(selectedResultForView.content as TestScore).percentage?.toFixed(1)}%</CardDescription></CardHeader></Card>
                    <Card><CardHeader className="p-3"><CardTitle className="text-sm font-medium">Time Taken</CardTitle><CardDescription className="text-2xl font-bold">{formatTime((selectedResultForView.content as TestScore).timeTakenSeconds)}</CardDescription></CardHeader></Card>
                  </div>
                  <h3 className="text-lg font-semibold">Answer Review:</h3>
                  <ul className="space-y-3">
                    {(selectedResultForView.content as TestScore).answers?.map((ans, index) => (
                      <li key={index} className={`p-3 border rounded-md ${ans.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                        <div className="font-medium mb-1">Q{index + 1}: <MathRenderer content={(ans.question as MCQQuestion).questionText}/></div>
                        <p className="text-sm">Your answer: <span className={ans.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                          {ans.userAnswerIndex !== null ? `${String.fromCharCode(65 + ans.userAnswerIndex)}. ` : 'Not answered '}
                          {ans.userAnswerIndex !== null && <MathRenderer content={(ans.question as MCQQuestion).options[ans.userAnswerIndex]}/>}
                          {ans.isCorrect ? <ShadcnCheckCircle className="inline w-4 h-4 ml-1 text-green-500"/> : <ShadcnXIcon className="inline w-4 h-4 ml-1 text-red-500"/>}
                        </span></p>
                        {!ans.isCorrect && (<p className="text-sm text-green-700 dark:text-green-400">Correct: {String.fromCharCode(65 + (ans.question as MCQQuestion).correctOptionIndex)}. <MathRenderer content={(ans.question as MCQQuestion).options[(ans.question as MCQQuestion).correctOptionIndex]}/></p>)}
                        {(ans.question as MCQQuestion).explanation && <p className="text-xs text-muted-foreground mt-1">Explanation: <MathRenderer content={(ans.question as MCQQuestion).explanation!}/></p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollArea>
              <DialogFooter className="p-6 pt-4 border-t">
                <Button variant="secondary" onClick={() => { /* TODO: Implement Retake Logic */ toast({title: "Retake Test (Coming Soon)"}); }}>Retake Test</Button>
                <DialogClose asChild><Button variant="outline" className="w-full sm:w-auto">Close</Button></DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


