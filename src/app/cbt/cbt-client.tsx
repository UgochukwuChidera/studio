
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, AlertTriangle, RotateCcw, Send, Home, Loader2, BookOpen, Brain, PlusCircle, Filter, MessageCircle, UploadCloud, Save, SlidersHorizontal, ListOrdered, Wrench, ServerIcon } from 'lucide-react';
import type { GeneratePracticeTestOutput, MCQQuestion, TestQuestion, GeneratePracticeTestInput } from '@/ai/flows/generate-practice-test-flow';
import { generatePracticeTest } from '@/ai/flows/generate-practice-test-flow';
import { ocrHandwrittenNotes } from '@/ai/flows/ocr-handwritten-notes';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { questionBank, Question as BankQuestion, Subject, Difficulty } from '@/data/question-bank';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { SavedContentItem } from '@/app/ai-content-generator/ai-content-generator-client';
import { ToolsDrawer } from '@/components/cbt/tools-drawer';
import MathRenderer from '@/components/math-renderer';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';

const MAX_FILE_SIZE_MB_CBT = 5;
const MAX_FILE_SIZE_BYTES_CBT = MAX_FILE_SIZE_MB_CBT * 1024 * 1024;

interface CBTTest extends GeneratePracticeTestOutput {
  timeLimitMinutes: number;
  id?: string; // Optional: ID of the original saved_material test
}

type UserAnswer = { questionIndex: number; selectedOptionIndex: number | null };

export type TestScore = {
    score: number;
    totalQuestions: number;
    percentage: number;
    answers: Array<{
        question: TestQuestion;
        userAnswerIndex: number | null;
        isCorrect: boolean;
    }>;
    testTitle: string;
    timeTakenSeconds?: number;
    originalTestId?: string | null; // Link to the saved_material of type 'test'
    originalTestType?: string | null; // e.g., 'multipleChoice'
};

type TestMode = 'select' | 'loadingTestData' | 'taking' | 'confirm_submit' | 'reviewing' | 'generating_custom_test';

const DEFAULT_BANK_TEST_LENGTH = 10;
const MINUTES_PER_QUESTION = 1;
const MAX_BANK_TEST_LENGTH = 50;

const allDifficulties: Difficulty[] = ['easy', 'medium', 'hard'];

const filterAndSampleQuestions = (
    questions: BankQuestion[],
    count: number,
    difficulty?: Difficulty
): BankQuestion[] => {
    let filteredQuestions = questions;
    if (difficulty && difficulty !== 'all') {
        filteredQuestions = questions.filter(q => q.difficulty === difficulty);
    }
    const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const getFriendlyFileTypeCBT = (mimeType: string): string => {
  if (!mimeType) return 'Unknown';
  if (mimeType.startsWith('image/')) return mimeType.split('/')[1]?.toUpperCase() || 'Image';
  switch (mimeType) {
    case 'application/pdf': return 'PDF';
    case 'text/plain': return 'TXT';
    case 'application/msword': return 'DOC';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return 'DOCX';
    default: return mimeType.split('/')[1]?.toUpperCase() || 'File';
  }
};

export default function CBTClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, session } = useAuth();

  const [currentTest, setCurrentTest] = useState<CBTTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [testMode, setTestMode] = useState<TestMode>('loadingTestData');
  const [finalScore, setFinalScore] = useState<TestScore | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<Subject | ''>('');
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [numBankQuestions, setNumBankQuestions] = useState(DEFAULT_BANK_TEST_LENGTH);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'all'>('all');

  const [customTestPrompt, setCustomTestPrompt] = useState('');
  const [customTestFile, setCustomTestFile] = useState<File | null>(null);
  const [customTestNumQuestions, setCustomTestNumQuestions] = useState(DEFAULT_BANK_TEST_LENGTH);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const customFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvailableSubjects(Array.from(new Set(questionBank.map(q => q.subject))) as Subject[]);
  }, []);

  useEffect(() => {
    const dataSource = searchParams.get('testDataSource');
    const testKey = searchParams.get('testKey');
    let testDataFromSource: GeneratePracticeTestOutput | null = null;

    if (dataSource === 'session' && testKey && typeof window !== 'undefined') {
        try {
            const storedData = sessionStorage.getItem(testKey);
            if (storedData) testDataFromSource = JSON.parse(storedData);
            else toast({ title: "Test Data Expired", variant: "destructive" });
        } catch (error) { toast({ title: "Error Loading Test (Session)", variant: "destructive" }); }
    }

    if (testDataFromSource) {
      const mcqQuestions = testDataFromSource.questions.filter(q => (q as MCQQuestion).options !== undefined) as MCQQuestion[];
      if(mcqQuestions.length === 0) {
           toast({ title: "No MCQs Found", variant: "destructive"});
           setTestMode('select');
      } else {
           const timeLimit = mcqQuestions.length * MINUTES_PER_QUESTION;
           // Pass along the original test ID if it exists in testDataFromSource (e.g., from MySavedMaterials)
           const originalTestId = (testDataFromSource as any).id || (testDataFromSource as any).originalTestId;
           setCurrentTest({ ...testDataFromSource, id: originalTestId, questions: mcqQuestions, timeLimitMinutes: timeLimit });
           setTestMode('loadingTestData');
      }
    } else {
      setTestMode('select');
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (currentTest && testMode === 'loadingTestData') {
      setUserAnswers(currentTest.questions.map((_, index) => ({ questionIndex: index, selectedOptionIndex: null })));
      setTimeLeft(currentTest.timeLimitMinutes * 60);
      setTestMode('taking');
      setCurrentQuestionIndex(0);
    }
  }, [currentTest, testMode]);

  const handleSaveTestResult = useCallback(async (scoreToSave: TestScore) => {
    if (!user || !session) {
      toast({ title: "Sign In Required", description: "Please sign in to save test results.", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        testTitle: scoreToSave.testTitle,
        originalTestId: scoreToSave.originalTestId,
        originalTestType: scoreToSave.originalTestType,
        score: scoreToSave.score,
        totalQuestions: scoreToSave.totalQuestions,
        percentage: scoreToSave.percentage,
        answers: scoreToSave.answers,
        timeTakenSeconds: scoreToSave.timeTakenSeconds,
      };
      const { data, error } = await supabase.functions.invoke('saveTestResult', { body: payload });
      if (error || !data?.success) {
        const errMsg = error instanceof FunctionsHttpError ? (await error.context.json().catch(()=>({})))?.error || error.message : error?.message || data?.error || "Failed to save to cloud.";
        throw new Error(errMsg);
      }
      toast({ title: "Results Saved!", description: `Test results for "${scoreToSave.testTitle}" saved to your history.` });
    } catch (e: any) {
      console.error("Failed to save test result to cloud:", e);
      toast({ title: "Save Failed", description: `Could not save test results to cloud: ${e.message}`, variant: "destructive" });
    }
  }, [user, session, toast]);

  const handleSubmitTest = useCallback((autoSubmitted = false) => {
    if (!currentTest) return;
    setTestMode('reviewing');
    let score = 0;
    const detailedAnswers = currentTest.questions.map((q, index) => {
      const mcq = q as MCQQuestion;
      const userAnswer = userAnswers.find(ans => ans.questionIndex === index);
      const isCorrect = userAnswer?.selectedOptionIndex === mcq.correctOptionIndex;
      if (isCorrect) score++;
      return { question: q, userAnswerIndex: userAnswer?.selectedOptionIndex ?? null, isCorrect };
    });
    const timeTaken = (currentTest.timeLimitMinutes * 60) - timeLeft;
    const calculatedFinalScore: TestScore = {
      score, totalQuestions: currentTest.questions.length,
      percentage: (score / currentTest.questions.length) * 100,
      answers: detailedAnswers, testTitle: currentTest.testTitle || "Practice Test Results",
      timeTakenSeconds: timeTaken,
      originalTestId: currentTest.id, // Pass original test ID
      originalTestType: "multipleChoice", // Assuming all tests here are MCQs
    };
    setFinalScore(calculatedFinalScore);
    handleSaveTestResult(calculatedFinalScore); // Save to cloud
    toast({ title: autoSubmitted ? "Time's Up!" : "Test Submitted!", description: `Your score is ${score}/${currentTest.questions.length}.` });
  }, [currentTest, userAnswers, timeLeft, toast, handleSaveTestResult]);


  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (testMode === 'taking' && timeLeft > 0) {
      timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (testMode === 'taking' && timeLeft <= 0) {
      handleSubmitTest(true);
    }
    return () => clearInterval(timerId);
  }, [testMode, timeLeft, handleSubmitTest]);

  const handleOptionChange = (questionIndex: number, optionIndex: number) => {
    setUserAnswers(prev => prev.map(ans => ans.questionIndex === questionIndex ? { ...ans, selectedOptionIndex: optionIndex } : ans));
  };

  const navigateQuestion = (direction: 'next' | 'prev' | number) => {
    if (!currentTest) return;
    let newIndex = currentQuestionIndex;
    if (direction === 'next') newIndex = Math.min(currentQuestionIndex + 1, currentTest.questions.length - 1);
    else if (direction === 'prev') newIndex = Math.max(currentQuestionIndex - 1, 0);
    else if (typeof direction === 'number') newIndex = Math.max(0, Math.min(direction, currentTest.questions.length - 1));
    setCurrentQuestionIndex(newIndex);
  };

  const formatTime = (seconds: number) : string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTestFromBank = (questionsToTake: BankQuestion[], title: string) => {
    if (questionsToTake.length === 0) {
      toast({ title: "No Questions Found", variant: "destructive" }); return;
    }
    const timeLimit = questionsToTake.length * MINUTES_PER_QUESTION;
    const test: CBTTest = {
      testTitle: title,
      questions: questionsToTake.map(q => ({
        questionText: q.questionText, options: q.options,
        correctOptionIndex: q.correctOptionIndex, explanation: q.explanation,
        bloomLevel: q.difficulty,
      })),
      timeLimitMinutes: timeLimit,
    };
    setCurrentTest(test); setTestMode('loadingTestData'); setCurrentQuestionIndex(0);
    toast({ title: "Test Started!", description: `Your "${title}" test is ready.`});
  };

  const handleStartGeneralTest = () => {
    const difficultyToFilter = selectedDifficulty === 'all' ? undefined : selectedDifficulty;
    const questions = filterAndSampleQuestions(questionBank, numBankQuestions, difficultyToFilter);
    startTestFromBank(questions, `General Knowledge Test (${numBankQuestions}q, ${selectedDifficulty})`);
  };

  const handleStartSpecificTest = () => {
    if (!selectedSubject) { toast({ title: "Select Subject", variant: "destructive" }); return; }
    const subjectQuestions = questionBank.filter(q => q.subject === selectedSubject);
    const difficultyToFilter = selectedDifficulty === 'all' ? undefined : selectedDifficulty;
    const questions = filterAndSampleQuestions(subjectQuestions, numBankQuestions, difficultyToFilter);
    startTestFromBank(questions, `${selectedSubject} Test (${numBankQuestions}q, ${selectedDifficulty})`);
  };

  const handleCustomTestFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES_CBT) {
        toast({ title: "File Too Large", description: `Max ${MAX_FILE_SIZE_MB_CBT}MB.`, variant: "destructive"});
        setCustomTestFile(null); if (customFileRef.current) customFileRef.current.value = ""; return;
      }
      setCustomTestFile(file); setCustomTestPrompt("");
    }
  };

  const handleGenerateCustomTest = async () => {
    if (!customTestPrompt && !customTestFile) { toast({ title: "Input Needed", variant: "destructive"}); return; }
    if (customTestNumQuestions <=0) { toast({ title: "Invalid Number", variant: "destructive"}); return; }
    setIsGeneratingCustom(true);
    toast({ title: "Generating Test...", description: "AI is creating your custom MCQ test."});

    let fileDataUriForAI: string | undefined;
    let textPromptForAI: string | undefined = customTestPrompt || undefined;

    try {
      if (customTestFile) {
        const fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(customTestFile);
        });
        if (customTestFile.type.startsWith('image/')) {
          const ocrResult = await ocrHandwrittenNotes({ photoDataUri: fileContent });
          textPromptForAI = ocrResult?.extractedText || `Describe image: ${customTestFile.name}`;
        } else {
          fileDataUriForAI = fileContent; // For PDF/TXT pass data URI, for DOCX/PPTX this path might need server extraction
          // For simplicity, if it's DOCX/PPTX and we don't have client-side parsing, we might use textPromptForAI.
          // This part needs robust server-side extraction for DOCX/PPTX if client-side is not viable.
          // Here, assuming `textGenerate` EF might handle `fileDataUri` for some types or rely on `textPromptForAI`.
          // This example prioritizes `textPromptForAI` if OCR gives something.
        }
      }
      if (!textPromptForAI && !fileDataUriForAI) throw new Error("No content to process for AI.");

      const input: GeneratePracticeTestInput = {
        textPrompt: textPromptForAI, fileDataUri: fileDataUriForAI,
        questionType: "multipleChoice", numberOfQuestions: customTestNumQuestions,
      };
      // Call client-side Genkit flow for this quick-generation in CBT
      const result = await generatePracticeTest(input);

      if (result?.questions) {
        const mcqs = result.questions.filter(q => (q as MCQQuestion).options) as MCQQuestion[];
        if (mcqs.length === 0) toast({ title: "No MCQs Generated", variant: "destructive" });
        else {
          setCurrentTest({ ...result, questions: mcqs, timeLimitMinutes: mcqs.length * MINUTES_PER_QUESTION });
          setTestMode('loadingTestData'); setCurrentQuestionIndex(0);
          toast({ title: "Custom Test Ready!", description: `Test "${result.testTitle}" ready.` });
          setCustomTestFile(null); setCustomTestPrompt(""); if (customFileRef.current) customFileRef.current.value = "";
        }
      } else throw new Error("AI failed to generate test.");
    } catch (error: any) {
      toast({ title: "Generation Error", description: error.message, variant: "destructive"});
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  if (testMode === 'loadingTestData' && !currentTest && (searchParams.get('testDataSource') || searchParams.get('testData'))) {
    return <div className="flex flex-col flex-1 justify-center items-center p-4"><Loader2 className="w-12 h-12 animate-spin text-primary mb-4" /><p>Loading test...</p></div>;
  }

  if (testMode === 'select' || testMode === 'generating_custom_test' || (testMode === 'loadingTestData' && !currentTest)) {
    return (
      <div className="container mx-auto py-8 px-4 flex flex-col items-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="text-center"><BookOpen className="w-16 h-16 text-primary mx-auto mb-4" /><CardTitle className="text-3xl font-bold text-primary">Test Arena</CardTitle><CardDescription className="text-lg">Choose or create your challenge!</CardDescription></CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Custom Test Creation UI */}
            <Card className="hover:shadow-md"><CardHeader><CardTitle className="text-xl flex items-center gap-2"><PlusCircle className="text-primary"/>Create Custom MCQ Test</CardTitle><CardDescription>Generate MCQs from a prompt or file.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <Textarea placeholder="Enter topic or paste content..." value={customTestPrompt} onChange={(e)=>{setCustomTestPrompt(e.target.value); if(e.target.value) setCustomTestFile(null);}} rows={3} disabled={isGeneratingCustom}/>
                <div className="text-center my-2 text-sm text-muted-foreground">OR</div>
                <Button variant="outline" onClick={()=>customFileRef.current?.click()} disabled={isGeneratingCustom} className="w-full gap-2"><UploadCloud size={18}/>{customTestFile ? customTestFile.name : "Upload File (Max 5MB)"}</Button>
                <input type="file" ref={customFileRef} onChange={handleCustomTestFileChange} className="hidden" accept="image/*,text/plain,application/pdf,.doc,.docx"/>
                {customTestFile && <p className="text-xs text-muted-foreground mt-1">Selected: {customTestFile.name} ({getFriendlyFileTypeCBT(customTestFile.type)})</p>}
                <div><Label htmlFor="customNumQ">Number of MCQs (1-100):</Label><Input id="customNumQ" type="number" value={customTestNumQuestions} onChange={(e)=>setCustomTestNumQuestions(Math.max(1,Math.min(100,parseInt(e.target.value)||1)))} min="1" max="100" disabled={isGeneratingCustom} className="mt-1"/></div>
                <Button onClick={handleGenerateCustomTest} className="w-full" disabled={isGeneratingCustom || (!customTestPrompt && !customTestFile)}>{isGeneratingCustom ? <Loader2 className="animate-spin mr-2"/> : <MessageCircle size={18} className="mr-2"/>}{isGeneratingCustom ? 'Generating...' : 'Generate & Start'}</Button>
              </CardContent>
            </Card>
            {/* General Knowledge Test UI */}
            <Card className="hover:shadow-md"><CardHeader><CardTitle className="text-xl flex items-center gap-2"><Brain className="text-primary"/>General Knowledge Test</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label htmlFor="genNumQ">Questions (1-{MAX_BANK_TEST_LENGTH}):</Label><Input id="genNumQ" type="number" value={numBankQuestions} onChange={(e)=>setNumBankQuestions(Math.max(1,Math.min(MAX_BANK_TEST_LENGTH,parseInt(e.target.value)||1)))} min="1" max={MAX_BANK_TEST_LENGTH} disabled={isGeneratingCustom} className="mt-1"/></div>
                  <div><Label htmlFor="genDiff">Difficulty:</Label><Select value={selectedDifficulty} onValueChange={(v)=>setSelectedDifficulty(v as Difficulty|'all')} disabled={isGeneratingCustom}><SelectTrigger id="genDiff" className="mt-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{allDifficulties.map(d=><SelectItem key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <Button onClick={handleStartGeneralTest} className="w-full mt-2" disabled={isGeneratingCustom}><ListOrdered size={18} className="mr-2"/>Start General Test</Button>
              </CardContent>
            </Card>
            {/* Specific Subject Test UI */}
            <Card className="hover:shadow-md"><CardHeader><CardTitle className="text-xl flex items-center gap-2"><Filter className="text-primary"/>Specific Subject Test</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedSubject} onValueChange={(v)=>setSelectedSubject(v as Subject)} disabled={isGeneratingCustom}><SelectTrigger><SelectValue placeholder="Select subject"/></SelectTrigger><SelectContent>{availableSubjects.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label htmlFor="subjNumQ">Questions (1-{MAX_BANK_TEST_LENGTH}):</Label><Input id="subjNumQ" type="number" value={numBankQuestions} onChange={(e)=>setNumBankQuestions(Math.max(1,Math.min(MAX_BANK_TEST_LENGTH,parseInt(e.target.value)||1)))} min="1" max={MAX_BANK_TEST_LENGTH} disabled={isGeneratingCustom || !selectedSubject} className="mt-1"/></div>
                    <div><Label htmlFor="subjDiff">Difficulty:</Label><Select value={selectedDifficulty} onValueChange={(v)=>setSelectedDifficulty(v as Difficulty|'all')} disabled={isGeneratingCustom || !selectedSubject}><SelectTrigger id="subjDiff" className="mt-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{allDifficulties.map(d=><SelectItem key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</SelectItem>)}</SelectContent></Select></div>
                 </div>
                <Button onClick={handleStartSpecificTest} className="w-full mt-2" disabled={!selectedSubject || isGeneratingCustom}><SlidersHorizontal size={18} className="mr-2"/>Start {selectedSubject||'Subject'} Test</Button>
              </CardContent>
            </Card>
             <Card className="hover:shadow-md"><CardHeader><CardTitle className="text-xl"><Link href="/ai-content-generator" className="flex items-center gap-2 hover:underline">Advanced Creation <PlusCircle size={20} className="text-primary"/></Link></CardTitle></CardHeader><CardContent><p className="text-muted-foreground mb-3">Need more options? Use the main AI Generator.</p><Button asChild className="w-full" disabled={isGeneratingCustom}><Link href="/ai-content-generator">Go to AI Generator</Link></Button></CardContent></Card>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (testMode === 'reviewing' && finalScore) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className={`mx-auto p-3 rounded-full w-fit mb-3 ${finalScore.percentage >= 70 ? 'bg-green-100 text-green-600' : finalScore.percentage >=40 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}><CheckCircle2 className="w-12 h-12"/></div>
            <CardTitle className="text-3xl font-bold text-primary">{finalScore.testTitle}</CardTitle>
            <CardDescription className="text-lg">Score: {finalScore.score}/{finalScore.totalQuestions} ({finalScore.percentage.toFixed(2)}%)</CardDescription>
            {finalScore.timeTakenSeconds !== undefined && <p className="text-sm text-muted-foreground">Time: {formatTime(finalScore.timeTakenSeconds)}</p>}
          </CardHeader>
          <CardContent className="space-y-6"><h3 className="text-xl font-semibold text-center">Review Answers</h3>
            <ul className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">{finalScore.answers.map((ans,idx)=>(<li key={idx} className={`p-4 rounded-md border ${ans.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/30':'border-red-500 bg-red-50 dark:bg-red-900/30'}`}><p className="font-medium mb-1">Q{idx+1}: <MathRenderer content={(ans.question as MCQQuestion).questionText}/></p><p className="text-sm">Your answer: <span className={ans.isCorrect?'text-green-700 dark:text-green-400':'text-red-700 dark:text-red-400'}>{ans.userAnswerIndex!==null?String.fromCharCode(65+ans.userAnswerIndex)+". ":'Not answered '}{ans.userAnswerIndex!==null && <MathRenderer content={(ans.question as MCQQuestion).options[ans.userAnswerIndex]}/>}</span></p>{!ans.isCorrect && <p className="text-sm text-green-700 dark:text-green-400">Correct: {String.fromCharCode(65+(ans.question as MCQQuestion).correctOptionIndex)}. <MathRenderer content={(ans.question as MCQQuestion).options[(ans.question as MCQQuestion).correctOptionIndex]}/></p>}{(ans.question as MCQQuestion).explanation && <p className="text-xs text-muted-foreground mt-1">Expl: <MathRenderer content={(ans.question as MCQQuestion).explanation!}/></p>}</li>))}</ul>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
            <Button onClick={()=>setTestMode('select')} variant="outline"><RotateCcw className="mr-2 h-4 w-4"/>Another Test</Button>
            <Button onClick={()=>router.push('/dashboard')}><Home className="mr-2 h-4 w-4"/>Dashboard</Button>
            <Button variant="default" onClick={() => handleSaveTestResult(finalScore)}><Save className="mr-2 h-4 w-4"/>Save to History</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (testMode === 'taking' && !currentTest) {
    return <div className="flex flex-col flex-1 justify-center items-center p-4"><AlertTriangle className="w-12 h-12 text-destructive mb-4"/><p className="text-lg text-destructive-foreground">Error: No test loaded.</p><Button onClick={()=>setTestMode('select')} className="mt-4">Select Test</Button></div>;
  }

  const currentQuestion = currentTest?.questions[currentQuestionIndex] as MCQQuestion;
  if (!currentQuestion) {
    return <div className="flex flex-col flex-1 justify-center items-center p-4"><Loader2 className="w-12 h-12 animate-spin text-primary mb-4"/><p>Loading question...</p></div>;
  }

  return (
    <div className="flex flex-col flex-1">
      <header className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
        <CardTitle className="text-lg sm:text-xl md:text-2xl font-semibold text-primary truncate max-w-[calc(100vw-250px)]">{currentTest.testTitle||"Practice Test"}</CardTitle>
        <div className="flex items-center gap-2"><ToolsDrawer/><div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted text-muted-foreground"><Clock className="w-5 h-5 text-primary"/><span className="font-mono text-lg font-semibold tabular-nums">{formatTime(timeLeft)}</span></div></div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-full sm:w-56 md:w-64 lg:w-72 border-r bg-muted/50 p-4 overflow-y-auto hidden sm:flex sm:flex-col">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Questions</h3>
          <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 gap-2">{currentTest.questions.map((_,idx)=>(<Button key={idx} variant={currentQuestionIndex===idx?'default':(userAnswers[idx]?.selectedOptionIndex!==null?'secondary':'outline')} size="sm" className={`aspect-square text-xs md:text-sm h-auto p-1 md:p-2 ${currentQuestionIndex===idx?'ring-2 ring-primary-foreground ring-offset-2 ring-offset-primary':''}`} onClick={()=>navigateQuestion(idx)}>{idx+1}</Button>))}</div>
          <div className="mt-auto pt-4"><p className="text-xs text-muted-foreground text-left mb-1">{userAnswers.filter(a=>a.selectedOptionIndex!==null).length} of {currentTest.questions.length} answered</p><Progress value={(userAnswers.filter(a=>a.selectedOptionIndex!==null).length/currentTest.questions.length)*100} className="h-2"/></div>
        </nav>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-background">
          <Card className="shadow-lg max-w-3xl mx-auto w-full">
            <CardHeader><CardTitle className="text-lg md:text-xl">Question {currentQuestionIndex+1} of {currentTest.questions.length}</CardTitle><CardDescription className="text-base md:text-lg leading-relaxed pt-2"><MathRenderer content={currentQuestion.questionText}/></CardDescription></CardHeader>
            <CardContent>
              <RadioGroup key={`rg-${currentQuestionIndex}`} value={userAnswers.find(a=>a.questionIndex===currentQuestionIndex)?.selectedOptionIndex?.toString()??""} onValueChange={(v)=>handleOptionChange(currentQuestionIndex, parseInt(v))} className="space-y-3">{currentQuestion.options.map((opt,idx)=>(<div key={`${currentQuestionIndex}-${idx}`} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/70 transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary"><RadioGroupItem value={idx.toString()} id={`q${currentQuestionIndex}-opt${idx}`} className="shrink-0"/><Label htmlFor={`q${currentQuestionIndex}-opt${idx}`} className="text-sm md:text-base flex-1 cursor-pointer"><MathRenderer content={opt}/></Label></div>))}</RadioGroup>
            </CardContent>
          </Card>
        </main>
      </div>
      <footer className="flex items-center justify-between p-4 border-t bg-card sticky bottom-0 z-10">
        <Button onClick={()=>navigateQuestion('prev')} disabled={currentQuestionIndex===0} variant="outline" className="gap-2"><ChevronLeft className="w-4 h-4"/>Previous</Button>
        <div className="sm:hidden text-sm text-muted-foreground">{currentQuestionIndex+1}/{currentTest.questions.length}</div>
        {currentQuestionIndex===currentTest.questions.length-1?(<AlertDialog><AlertDialogTrigger asChild><Button variant="default" className="gap-2 bg-green-600 hover:bg-green-700 text-primary-foreground dark:text-primary-foreground">Submit Test <Send className="w-4 h-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Submission</AlertDialogTitle><AlertDialogDescription>You answered {userAnswers.filter(a=>a.selectedOptionIndex!==null).length} of {currentTest.questions.length}. Submit?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Review</AlertDialogCancel><AlertDialogAction onClick={()=>handleSubmitTest(false)}>Submit Now</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>):(<Button onClick={()=>navigateQuestion('next')} disabled={currentQuestionIndex===currentTest.questions.length-1} className="gap-2">Next <ChevronRight className="w-4 h-4"/></Button>)}
      </footer>
    </div>
  );
}


