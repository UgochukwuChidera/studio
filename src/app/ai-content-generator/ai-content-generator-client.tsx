
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

import { generatePracticeTest as generatePracticeTestClient, type GeneratePracticeTestInput, type GeneratePracticeTestOutput, type MCQQuestion, type DescriptiveQuestion } from '@/ai/flows/generate-practice-test-flow';
import { generateFlashcards as generateFlashcardsClient, type GenerateFlashcardsInput, type GenerateFlashcardsOutput, type Flashcard } from '@/ai/flows/generate-flashcards-flow';
import { generateNotes as generateNotesClient, type GenerateNotesInput, type GenerateNotesOutput, type NoteLength } from '@/ai/flows/generate-notes-flow';

import { BloomLevelSchema, type BloomLevel } from '@/ai/schemas';
import { Badge } from '@/components/ui/badge';
import { Alert as ShadcnAlert, AlertDescription as ShadcnAlertDescription, AlertTitle as ShadcnAlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Lightbulb, Loader2, AlertTriangle, UploadCloud, FlaskConical, BookOpen, StickyNote, FileQuestion, ListChecks, MessageSquare, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, Download, Share2, Save, BrainCircuit, Zap, XCircle, FileUp, Server, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MathRenderer from '@/components/math-renderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const GENERAL_DIFFICULTY_SELECT_VALUE = "__GENERAL_DIFFICULTY__";
const POLLING_INTERVAL_MS = 5000;

export type GenerationType = "test" | "flashcards" | "note" | "test_result"; // From MySavedMaterials
type QuestionType = "multipleChoice" | "descriptive";

export interface TestScore {
    score: number;
    totalQuestions: number;
    percentage: number;
    answers: Array<{
        question: GeneratePracticeTestOutput['questions'][0];
        userAnswerIndex: number | null;
        isCorrect: boolean;
    }>;
    testTitle: string;
    timeTakenSeconds?: number;
    originalTestId?: string;
    originalTestType?: string;
}

export interface SavedContentItem {
  id: string; // Cloud ID from saved_materials
  type: GenerationType;
  title: string;
  content: GeneratePracticeTestOutput | GenerateNotesOutput | GenerateFlashcardsOutput | TestScore | null;
  status?: string; // Top-level status from saved_materials
  savedAt: string; // ISO string from created_at or updated_at
  fileInfo?: { name: string; type: string; size: number };
  sourceTextPrompt?: string | null;
  generationParams?: any;
  user_id?: string;
  storagePath?: string;
  isLocal?: boolean; // True if item originated locally or failed to sync and is only local
  cloudId?: string; // Could be same as 'id' if synced
}

interface ProcessingJob {
  jobId: string; // Corresponds to id in file_processing_jobs table
  materialId: string; // Corresponds to id in saved_materials table
  fileName: string;
  status: 'PENDING_UPLOAD' | 'PENDING_EXTRACTION' | 'EXTRACTING' | 'TEXT_EXTRACTED_PENDING_AI' | 'AI_GENERATING_CLIENT' | 'COMPLETED_AI_PROCESSED' | 'EXTRACTION_FAILED' | 'EXTRACTION_UNSUPPORTED' | 'AI_GENERATION_FAILED';
  progressMessage: string;
  extractedText?: string | null;
  generationParams: any;
  originalFileType: string;
}

const getFriendlyFileType = (fileTypeOrMime: string): string => {
  if (!fileTypeOrMime) return 'Unknown';
  if (fileTypeOrMime.startsWith('image/')) {
    const imageType = fileTypeOrMime.split('/')[1];
    return imageType ? imageType.toUpperCase() : 'Image';
  }
  switch (fileTypeOrMime) {
    case 'application/pdf': return 'PDF';
    case 'text/plain': return 'TXT';
    case 'application/msword': return 'DOC';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return 'DOCX';
    case 'application/vnd.ms-powerpoint': return 'PPT';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': return 'PPTX';
    default:
      const subtype = fileTypeOrMime.split('/')[1];
      return subtype ? subtype.toUpperCase() : 'File';
  }
};

const FlashcardViewer: React.FC<{ flashcardsOutput: GenerateFlashcardsOutput }> = ({ flashcardsOutput }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcardsOutput]);

  if (!flashcardsOutput || !flashcardsOutput.flashcards || flashcardsOutput.flashcards.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No flashcards to display.</p>;
  }
  const currentFlashcard = flashcardsOutput.flashcards[currentIndex];
  const handleNext = () => { setIsFlipped(false); setCurrentIndex((prev) => Math.min(prev + 1, flashcardsOutput.flashcards.length - 1)); };
  const handlePrevious = () => { setIsFlipped(false); setCurrentIndex((prev) => Math.max(prev - 1, 0)); };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-3 text-center">{flashcardsOutput.title || "Flashcards"} ({currentIndex + 1} / {flashcardsOutput.flashcards.length})</h3>
      <div className="perspective-1000px w-full md:max-w-lg mx-auto">
        <div
          className={`relative w-full min-h-[18rem] md:min-h-[20rem] h-auto transform-style-preserve-3d transition-transform duration-700 ease-in-out ${isFlipped ? 'rotate-y-180' : ''}`}
          onClick={() => setIsFlipped(!isFlipped)} role="button" tabIndex={0} aria-label={`Flashcard ${currentIndex + 1}. Front: ${currentFlashcard.front}. Click to flip.`} onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? setIsFlipped(!isFlipped) : null}
        >
          <Card className="absolute w-full h-full backface-hidden flex flex-col justify-center items-center text-center p-4 md:p-6 cursor-pointer shadow-xl hover:shadow-2xl transition-shadow bg-card ring-1 ring-border">
            <div className="flex-grow flex items-center justify-center overflow-y-auto py-2"><MathRenderer content={currentFlashcard.front} className="text-2xl md:text-3xl font-medium text-card-foreground" /></div>
            <p className="text-xs text-muted-foreground mt-auto pt-2">(Question - Click to flip)</p>
          </Card>
          <Card className="absolute w-full h-full backface-hidden rotate-y-180 flex flex-col justify-center items-center text-center p-4 md:p-6 cursor-pointer shadow-xl hover:shadow-2xl transition-shadow bg-secondary ring-1 ring-border">
            <div className="flex-grow flex items-center justify-center overflow-y-auto py-2"><MathRenderer content={currentFlashcard.back} className="text-xl md:text-2xl text-secondary-foreground" /></div>
            <p className="text-xs text-muted-foreground mt-auto pt-2">(Answer - Click to flip)</p>
          </Card>
        </div>
      </div>
      <div className="flex justify-between items-center mt-6">
        <Button onClick={handlePrevious} disabled={currentIndex === 0} variant="outline" className="rounded-full p-3 hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Previous flashcard"><ChevronLeft size={24} /></Button>
        <Button onClick={() => setIsFlipped(!isFlipped)} variant="ghost" className="gap-2" aria-label="Flip current card"><RotateCcw size={18} /> Flip Card</Button>
        <Button onClick={handleNext} disabled={currentIndex === flashcardsOutput.flashcards.length - 1} variant="outline" className="rounded-full p-3 hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Next flashcard"><ChevronRight size={24} /></Button>
      </div>
    </div>
  );
};

export default function AIContentGeneratorClient() {
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUriForImagePreview, setFileDataUriForImagePreview] = useState<string | null>(null);
  const [friendlyFileType, setFriendlyFileType] = useState<string | null>(null);
  const [textPrompt, setTextPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { user, session } = useAuth();

  const [generationType, setGenerationType] = useState<Exclude<GenerationType, "test_result">>("test");
  const [questionType, setQuestionType] = useState<QuestionType>("multipleChoice");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [numFlashcards, setNumFlashcards] = useState<number>(10);
  const [noteLength, setNoteLength] = useState<NoteLength>("medium");
  const [useBloomsTaxonomy, setUseBloomsTaxonomy] = useState<boolean>(false);
  const [selectedBloomLevel, setSelectedBloomLevel] = useState<BloomLevel | typeof GENERAL_DIFFICULTY_SELECT_VALUE>(GENERAL_DIFFICULTY_SELECT_VALUE);

  const [generatedTest, setGeneratedTest] = useState<GeneratePracticeTestOutput | null>(null);
  const [generatedFlashcards, setGeneratedFlashcards] = useState<GenerateFlashcardsOutput | null>(null);
  const [generatedNotes, setGeneratedNotes] = useState<GenerateNotesOutput | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [processingJobs, setProcessingJobs] = useState<Record<string, ProcessingJob>>({});
  const activeJobIdRef = useRef<string | null>(null); // Store the current job ID being tracked (could be UI-temp or DB-actual)
  const currentMaterialIdRef = useRef<string | null>(null); // Store the materialId for the current operation


  const updateJobState = (jobId: string, updates: Partial<ProcessingJob>) => {
    setProcessingJobs(prev => {
      const existingJob = prev[jobId];
      if (!existingJob && (updates.status || updates.fileName)) {
        return {
          ...prev,
          [jobId]: {
            jobId,
            materialId: updates.materialId || currentMaterialIdRef.current || '',
            fileName: updates.fileName || 'Processing File...',
            status: updates.status || 'PENDING_UPLOAD',
            progressMessage: updates.progressMessage || 'Starting...',
            generationParams: updates.generationParams || {},
            originalFileType: updates.originalFileType || 'unknown',
            ...updates
          }
        };
      }
      return { ...prev, [jobId]: { ...existingJob, ...updates }};
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); setIsDragging(false);
    if (isLoading || Object.values(processingJobs).some(j => j.status !== 'COMPLETED_AI_PROCESSED' && j.status !== 'EXTRACTION_FAILED' && j.status !== 'AI_GENERATION_FAILED' && j.status !== 'EXTRACTION_UNSUPPORTED')) return;
    const selectedFile = event.dataTransfer.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      toast({ title: 'File Too Large', description: `Please select a smaller file (max ${MAX_FILE_SIZE_MB}MB).`, variant: 'destructive'});
      setFile(null); setFileDataUriForImagePreview(null); setFriendlyFileType(null);
      return;
    }
    setFile(selectedFile);
    setFriendlyFileType(getFriendlyFileType(selectedFile.type || selectedFile.name.split('.').pop() || ''));
    setTextPrompt(""); // Clear text prompt when a file is selected
    setError(null);
    setGeneratedTest(null); setGeneratedFlashcards(null); setGeneratedNotes(null);
    activeJobIdRef.current = null;
    currentMaterialIdRef.current = null;

    if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setFileDataUriForImagePreview(e.target?.result as string);
        reader.readAsDataURL(selectedFile);
    } else {
        setFileDataUriForImagePreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!file && !textPrompt.trim()) {
      setError('Please upload a file or enter a text prompt.');
      toast({ title: 'Input Required', description: 'Please provide material for generation.', variant: 'destructive'});
      return;
    }
    if (!user || !session) {
      toast({ title: "Authentication Required", description: "Please sign in to generate content.", variant: "destructive" });
      setError("User not authenticated.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedTest(null); setGeneratedFlashcards(null); setGeneratedNotes(null);
    activeJobIdRef.current = null;
    currentMaterialIdRef.current = null;

    const currentGenerationParams = {
      ...(generationType === 'test' && { questionType, numberOfQuestions: numQuestions, bloomLevel: useBloomsTaxonomy && selectedBloomLevel !== GENERAL_DIFFICULTY_SELECT_VALUE ? selectedBloomLevel as BloomLevel : undefined }),
      ...(generationType === 'flashcards' && { numberOfFlashcards: numFlashcards }),
      ...(generationType === 'note' && { noteLength }),
    };

    if (file) { // Complex file flow
      const tempUiJobId = `ui-job-${uuidv4()}`;
      activeJobIdRef.current = tempUiJobId; // Track UI job first
      updateJobState(tempUiJobId, {
        jobId: tempUiJobId, fileName: file.name, status: 'PENDING_UPLOAD',
        progressMessage: `Preparing ${file.name}...`, generationParams: currentGenerationParams, originalFileType: file.type,
      });

      try {
        updateJobState(tempUiJobId, { progressMessage: `Uploading ${file.name}...` });
        const storagePath = `user_uploads/${user.id}/${uuidv4()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('material-uploads').upload(storagePath, file);
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        updateJobState(tempUiJobId, { progressMessage: 'Creating material placeholder...' });
        const initialMaterialPayload = {
          title: file.name.substring(0, 100), type: generationType,
          sourceFileInfo: { name: file.name, type: getFriendlyFileType(file.type), size: file.size },
          generationParams: currentGenerationParams, storagePath: storagePath,
          status: "PENDING_EXTRACTION", // Use new top-level status
        };
        const { data: savedMaterialResponse, error: saveMaterialError } = await supabase.functions.invoke('saveMaterial', { body: initialMaterialPayload });
        if (saveMaterialError || !savedMaterialResponse?.success || !savedMaterialResponse.material?.id) {
          const errMsg = saveMaterialError instanceof FunctionsHttpError ? (await saveMaterialError.context.json().catch(()=>({})))?.error || saveMaterialError.message : saveMaterialError?.message || savedMaterialResponse?.error || "Failed to create initial material record.";
          throw new Error(errMsg);
        }
        currentMaterialIdRef.current = savedMaterialResponse.material.id; // Store the material ID
        updateJobState(tempUiJobId, { materialId: currentMaterialIdRef.current, progressMessage: 'Initiating file processing...' });

        const { data: initData, error: initError } = await supabase.functions.invoke('initFileProcessing', {
          body: { materialId: currentMaterialIdRef.current, originalFileName: file.name, fileType: file.type, storagePath, generationParams: currentGenerationParams },
        });
        if (initError || !initData?.success || !initData.jobId) {
           const errMsg = initError instanceof FunctionsHttpError ? (await initError.context.json().catch(()=>({})))?.error || initError.message : initError?.message || initData?.error || 'Failed to initiate file processing on server.';
           throw new Error(errMsg);
        }

        setProcessingJobs(prev => {
            const oldJobData = prev[tempUiJobId];
            const {[tempUiJobId]: _, ...rest} = prev;
            return {...rest, [initData.jobId]: {...oldJobData, jobId: initData.jobId, materialId: currentMaterialIdRef.current!, status: 'PENDING_EXTRACTION', progressMessage: 'Awaiting text extraction...'}};
        });
        activeJobIdRef.current = initData.jobId; // Now track the actual DB job ID

      } catch (err: any) {
        console.error("Complex File Processing Initiation Error:", err);
        updateJobState(tempUiJobId, { status: 'EXTRACTION_FAILED', progressMessage: `Error: ${err.message}` });
        setError(`Error: ${err.message}`);
        toast({ title: 'Processing Error', description: err.message, variant: 'destructive' });
        setIsLoading(false);
      }
    } else if (textPrompt.trim()) { // TXT / Direct prompt flow
      const tempUiJobId = `ui-job-${uuidv4()}`;
      activeJobIdRef.current = tempUiJobId;
      updateJobState(tempUiJobId, {
          jobId: tempUiJobId, materialId: '', fileName: "Text Prompt", status: 'AI_GENERATING_CLIENT',
          progressMessage: `Sending to AI for ${generationType}...`, generationParams: currentGenerationParams, originalFileType: 'text/plain'
      });

      try {
        const { data: aiResultData, error: efError } = await supabase.functions.invoke('textGenerate', {
          body: { textContent: textPrompt.trim(), generationType, generationParams: currentGenerationParams },
        });
        if (efError || !aiResultData?.success || !aiResultData.generatedContent) {
          const message = efError instanceof FunctionsHttpError ? (await efError.context.json().catch(() => ({})))?.error || efError.message : efError?.message || aiResultData?.error || 'AI generation via Edge Function failed.';
          throw new Error(message);
        }
        processAiResult(aiResultData.generatedContent, generationType, currentGenerationParams, "Text Prompt", tempUiJobId);
        // For direct text, we save new material record. No materialIdToUpdate.
        await handleSaveMaterial(aiResultData.generatedContent, generationType, currentGenerationParams, "Text Prompt", textPrompt.trim(), undefined, tempUiJobId);

      } catch (err: any) {
        console.error("Direct Text/TXT AI Generation Error:", err);
        updateJobState(tempUiJobId, { status: 'AI_GENERATION_FAILED', progressMessage: `Error: ${err.message}` });
        setError(`AI Generation Failed: ${err.message}`);
        toast({ title: 'AI Generation Error', description: err.message, variant: 'destructive' });
      } finally {
        setIsLoading(false);
        // activeJobIdRef.current = null; // Cleared in handleSaveMaterial for success
      }
    }
  };

  const processAiResult = (aiResult: any, type: GenerationType, params: any, sourceName: string, jobUiIdToUpdate: string) => {
    let successMessage = ""; let successDescription = ""; let generatedItemCount = 0;
    if (type === "test") {
      if (!aiResult || !aiResult.testTitle) throw new Error("AI returned invalid test data.");
      setGeneratedTest(aiResult); successMessage = "Test Generated!"; generatedItemCount = aiResult.questions?.length || 0;
      successDescription = `${generatedItemCount} ${params.questionType === "multipleChoice" ? "MCQ" : "Descriptive"} question(s) created.`;
    } else if (type === "flashcards") {
      if (!aiResult || !aiResult.title) throw new Error("AI returned invalid flashcard data.");
      setGeneratedFlashcards(aiResult); successMessage = "Flashcards Generated!"; generatedItemCount = aiResult.flashcards?.length || 0;
      successDescription = `${generatedItemCount} flashcard(s) created.`;
    } else { // note
      if (!aiResult || !aiResult.title) throw new Error("AI returned invalid notes data.");
      setGeneratedNotes(aiResult); successMessage = "Notes Generated!";
      successDescription = `Your ${params.noteLength} notes are ready.`;
    }
    updateJobState(jobUiIdToUpdate, { status: 'AI_GENERATING_CLIENT', progressMessage: successDescription });
    toast({ title: successMessage, description: successDescription, variant: "default" });
  };

  useEffect(() => {
    if (!activeJobIdRef.current || !processingJobs[activeJobIdRef.current]) return;
    const currentJobDetails = processingJobs[activeJobIdRef.current];

    if (!currentJobDetails.jobId.startsWith('ui-job-') && (currentJobDetails.status === 'PENDING_EXTRACTION' || currentJobDetails.status === 'EXTRACTING')) {
      const timer = setTimeout(async () => {
        if (!activeJobIdRef.current || processingJobs[activeJobIdRef.current]?.jobId.startsWith('ui-job-')) return;
        const dbJobId = processingJobs[activeJobIdRef.current]?.jobId;
        try {
          const { data, error: pollError } = await supabase
            .from('file_processing_jobs')
            .select('status, extracted_text, error_message, material_id') // Ensure material_id is selected
            .eq('id', dbJobId)
            .single();

          if (pollError) throw pollError;

          if (data) {
            let progressMessage = currentJobDetails.progressMessage;
            if (data.status === 'TEXT_EXTRACTED_PENDING_AI') progressMessage = 'Text extracted. Preparing AI generation...';
            else if (data.status === 'EXTRACTION_FAILED') progressMessage = `Extraction Failed: ${data.error_message || 'Unknown error'}`;
            else if (data.status === 'EXTRACTION_UNSUPPORTED') progressMessage = `File type not supported for direct extraction.`;

            updateJobState(dbJobId, {
              status: data.status as ProcessingJob['status'],
              extractedText: data.extracted_text,
              progressMessage,
              materialId: data.material_id || currentJobDetails.materialId, // Keep materialId
            });
            currentMaterialIdRef.current = data.material_id || currentJobDetails.materialId; // Update ref if needed

            if (data.status === 'EXTRACTION_FAILED' || data.status === 'EXTRACTION_UNSUPPORTED') {
                setIsLoading(false);
                activeJobIdRef.current = null;
            }
          }
        } catch (err: any) {
          console.error("Polling Error:", err);
          updateJobState(dbJobId, { status: 'EXTRACTION_FAILED', progressMessage: `Polling error: ${err.message}` });
          setIsLoading(false);
          activeJobIdRef.current = null;
        }
      }, POLLING_INTERVAL_MS);
      return () => clearTimeout(timer);
    }
  }, [processingJobs, supabase]);

  useEffect(() => {
    if (!activeJobIdRef.current || !processingJobs[activeJobIdRef.current]) return;
    const currentJobDetails = processingJobs[activeJobIdRef.current];

    if (currentJobDetails.status === 'TEXT_EXTRACTED_PENDING_AI' && currentJobDetails.extractedText) {
      const runClientSideAI = async () => {
        updateJobState(currentJobDetails.jobId, { status: 'AI_GENERATING_CLIENT', progressMessage: `Generating ${generationType} with AI...` });
        let aiResult;
        try {
          const aiInputText = currentJobDetails.extractedText!;
          if (generationType === 'test') {
            aiResult = await generatePracticeTestClient({ textPrompt: aiInputText, ...currentJobDetails.generationParams });
          } else if (generationType === 'flashcards') {
            aiResult = await generateFlashcardsClient({ textPrompt: aiInputText, ...currentJobDetails.generationParams });
          } else if (generationType === 'note') {
            aiResult = await generateNotesClient({ textPrompt: aiInputText, ...currentJobDetails.generationParams });
          }
          if (!aiResult) throw new Error("Client-side AI generation returned no result.");

          processAiResult(aiResult, generationType, currentJobDetails.generationParams, currentJobDetails.fileName, currentJobDetails.jobId);
          // Pass the materialId from the job to update the correct saved_materials record
          await handleSaveMaterial(aiResult, generationType, currentJobDetails.generationParams, currentJobDetails.fileName, aiInputText, currentJobDetails.materialId, currentJobDetails.jobId);

        } catch (err: any) {
          console.error("Client-Side AI Generation Error:", err);
          updateJobState(currentJobDetails.jobId, { status: 'AI_GENERATION_FAILED', progressMessage: `Error: ${err.message}` });
          setError(`Client-Side AI Error: ${err.message}`);
          toast({ title: 'AI Generation Error (Client)', description: err.message, variant: 'destructive' });
          setIsLoading(false);
        }
      };
      runClientSideAI();
    }
  }, [processingJobs, generationType, generatePracticeTestClient, generateFlashcardsClient, generateNotesClient]); // Removed currentMaterialIdRef from deps, it's a ref


  const handleSaveMaterial = async (
        contentToSave: GeneratePracticeTestOutput | GenerateNotesOutput | GenerateFlashcardsOutput,
        itemTypeToSave: Exclude<GenerationType, "test_result">,
        genParams: any,
        sourceName: string,
        sourceTextUsedForAI: string | null,
        materialIdToUpdate?: string | null, // ID of the saved_materials record to update
        jobUiIdToUpdate?: string
    ) => {
    if (!contentToSave || !itemTypeToSave) {
      toast({ title: "Nothing to Save", description: "Generated content is missing.", variant: "destructive" });
      if (jobUiIdToUpdate) updateJobState(jobUiIdToUpdate, { status: 'AI_GENERATION_FAILED', progressMessage: "Content missing for save."});
      return;
    }
    if (!user || !session) {
      toast({ title: "Not Signed In", description: "Please sign in to save materials.", variant: "destructive" });
      if (jobUiIdToUpdate) updateJobState(jobUiIdToUpdate, { status: 'AI_GENERATION_FAILED', progressMessage: "User not signed in."});
      return;
    }
    setIsSaving(true);
    if (jobUiIdToUpdate) updateJobState(jobUiIdToUpdate, { progressMessage: "Saving final content..." });

    const payload: any = {
      title: (contentToSave as any).title || (contentToSave as GeneratePracticeTestOutput).testTitle || sourceName.substring(0,100) || "Generated Material",
      type: itemTypeToSave,
      content: contentToSave,
      sourceFileInfo: file && sourceName !== "Text Prompt" ? { name: sourceName, type: getFriendlyFileType(file.type), size: file.size } : (sourceName !== "Text Prompt" && sourceTextUsedForAI ? { name: sourceName, type: "text/plain", size: sourceTextUsedForAI.length} : null),
      sourceTextPrompt: sourceTextUsedForAI,
      generationParams: genParams,
      status: "COMPLETED", // Final status for the material
    };
    // If materialIdToUpdate (which is currentMaterialIdRef.current) is available, pass it to update existing record
    if (materialIdToUpdate) {
        payload.id = materialIdToUpdate;
    }

    try {
      const { data: saveData, error: saveError } = await supabase.functions.invoke('saveMaterial', { body: payload });
      if (saveError || !saveData?.success) {
        const message = saveError instanceof FunctionsHttpError ? (await saveError.context.json().catch(() => ({})))?.error || saveError.message : saveError?.message || saveData?.error || "Failed to save material to cloud.";
        throw new Error(message);
      }
      toast({ title: "Material Saved!", description: `"${payload.title}" successfully saved.` });
      if (jobUiIdToUpdate) {
         updateJobState(jobUiIdToUpdate, { status: 'COMPLETED_AI_PROCESSED', progressMessage: 'Successfully generated and saved!' });
      }
      activeJobIdRef.current = null; // Clear active job
      currentMaterialIdRef.current = null; // Clear material ID

      setGeneratedTest(null); setGeneratedFlashcards(null); setGeneratedNotes(null);
      setFile(null); setTextPrompt(""); setFileDataUriForImagePreview(null); setFriendlyFileType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (cloudError: any) {
      console.error("Save Material Error:", cloudError);
      toast({ title: "Cloud Save Failed", description: cloudError.message, variant: "destructive" });
      if (jobUiIdToUpdate) updateJobState(jobUiIdToUpdate, { status: 'AI_GENERATION_FAILED', progressMessage: `Save failed: ${cloudError.message}`});
    } finally {
      setIsSaving(false);
      setIsLoading(false); // General loading ends when save attempt finishes
    }
  };

  const handleDownload = (format: 'json' | 'pdf') => {
    let contentToDownload: any = null;
    let filenamePrefix = "generated_content";

    if (generationType === "test" && generatedTest) { contentToDownload = generatedTest; filenamePrefix = generatedTest.testTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || "test"; }
    else if (generationType === "flashcards" && generatedFlashcards) { contentToDownload = generatedFlashcards; filenamePrefix = generatedFlashcards.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || "flashcards"; }
    else if (generationType === "note" && generatedNotes) { contentToDownload = generatedNotes; filenamePrefix = generatedNotes.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || "notes"; }

    if (!contentToDownload) { toast({ title: "Nothing to Download", description: "Please generate content first.", variant: "destructive" }); return; }

    if (format === 'json') {
      const jsonString = JSON.stringify(contentToDownload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href; link.download = `${filenamePrefix}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(href);
      toast({ title: "JSON Downloaded", description: `${filenamePrefix}.json has been downloaded.` });
    } else if (format === 'pdf') {
       if (generationType === 'note') { toast({ title: "PDF Download (Coming Soon)", description: "Server-side PDF generation for notes is planned.", variant: "default" }); }
       else { toast({ title: "PDF Download Not Available", description: "PDF download is currently only planned for notes.", variant: "destructive" }); }
    }
  };

  const handleTakeTestInArena = () => {
    if (!generatedTest || !generatedTest.questions || generatedTest.questions.length === 0) { toast({ title: "No Test Available", description: "Please generate a test with MCQ questions first.", variant: "destructive" }); return; }
    const mcqQuestions = generatedTest.questions.filter(q => (q as MCQQuestion).options !== undefined);
    if (mcqQuestions.length === 0) { toast({ title: "No MCQs", description: "This test has no multiple-choice questions.", variant: "destructive" }); return; }
    const testDataForArena: GeneratePracticeTestOutput = { ...generatedTest, questions: mcqQuestions };
    try {
      const testKey = `cbt-test-data-${Date.now()}`;
      sessionStorage.setItem(testKey, JSON.stringify(testDataForArena));
      router.push(`/cbt?testDataSource=session&testKey=${testKey}`);
    } catch (e) { console.error("Error storing test data for CBT:", e); toast({ title: "Error", description: "Could not prepare test for Test Arena.", variant: "destructive" }); }
  };

  const handleShare = () => {
    let contentToShare: any = null;
    let shareType: 'test' | 'notes' | null = null;
    let titleForShare = "Shared Content";
    let itemIdForLink = currentMaterialIdRef.current || Date.now().toString(); // Use material ID if available

    if (generationType === "test" && generatedTest) { contentToShare = generatedTest; shareType = 'test'; titleForShare = generatedTest.testTitle; itemIdForLink = 'test-' + itemIdForLink; }
    else if (generationType === "note" && generatedNotes) { contentToShare = generatedNotes; shareType = 'notes'; titleForShare = generatedNotes.title; itemIdForLink = 'notes-' + itemIdForLink; }
    else if (generationType === "flashcards" && generatedFlashcards) { toast({ title: "Share Flashcards (Coming Soon)", description: "Direct sharing for flashcard decks is planned.", variant: "default" }); return; }

    if (!contentToShare || !shareType) { toast({ title: "Nothing to Share", description: "Please generate content first.", variant: "destructive" }); return; }

    try {
        const shareKey = `shared-${shareType}-${itemIdForLink}`;
        sessionStorage.setItem(shareKey, JSON.stringify(contentToShare));
        const shareableLink = `${window.location.origin}/${shareType === 'test' ? 'test' : 'view-notes'}/${itemIdForLink}?dataSource=session&key=${shareKey}`;
        navigator.clipboard.writeText(shareableLink).then(() => { toast({ title: "Link Copied!", description: `Shareable link for "${titleForShare}" copied.` });
        }).catch(() => { toast({ title: "Copy Failed", description: "Could not copy link.", variant: "destructive" }); });
    } catch (e) { console.error("Error storing shared data:", e); toast({ title: "Error Sharing", description: "Could not prepare content for sharing.", variant: "destructive" }); }
  };

  const currentJobForDisplay = activeJobIdRef.current ? processingJobs[activeJobIdRef.current] : null;
  const displayLoadingStep = isLoading ? (currentJobForDisplay?.progressMessage || "Processing...") : "";
  const isProcessingFile = currentJobForDisplay && !['COMPLETED_AI_PROCESSED', 'EXTRACTION_FAILED', 'AI_GENERATION_FAILED', 'EXTRACTION_UNSUPPORTED'].includes(currentJobForDisplay.status);
  const currentGenerationParamsForSave = currentJobForDisplay?.generationParams || {
      ...(generationType === 'test' && { questionType, numberOfQuestions: numQuestions, bloomLevel: useBloomsTaxonomy && selectedBloomLevel !== GENERAL_DIFFICULTY_SELECT_VALUE ? selectedBloomLevel as BloomLevel : undefined }),
      ...(generationType === 'flashcards' && { numberOfFlashcards: numFlashcards }),
      ...(generationType === 'note' && { noteLength }),
    };

  return (
    <div className="flex flex-col flex-1 w-full min-h-screen px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
      <header className="mb-8 text-center w-full">
        <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-3">
          <Zap className="w-10 h-10" /> AI Content Generator
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload study materials or provide a text prompt. Our AI crafts practice tests, flashcards, or notes.
        </p>
      </header>

      <section className="mb-10 w-full">
        <h2 className="text-2xl font-semibold mb-4 text-center sm:text-left">1. Provide Your Material</h2>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-start p-6 border rounded-lg shadow-sm bg-card`}>
            <div
                className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer
                            bg-muted/30 hover:bg-muted/50 transition-colors min-h-[200px]
                            ${isLoading || isProcessingFile ? 'opacity-50 cursor-not-allowed' : ''}
                            ${isDragging ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-input hover:border-primary'}`}
                onClick={() => !(isLoading || isProcessingFile) && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!(isLoading || isProcessingFile)) setIsDragging(true);}}
                onDragEnter={(e) => { e.preventDefault(); if (!(isLoading || isProcessingFile)) setIsDragging(true);}}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false);}}
                onDrop={handleDrop} role="button" tabIndex={(isLoading || isProcessingFile) ? -1 : 0} aria-label="File upload area"
                >
                 <div className="text-center pointer-events-none">
                    <UploadCloud className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <p className="mb-2 text-lg font-semibold text-foreground">
                      {file ? `Selected: ${file.name}` : 'Drag & drop file or click to browse'}
                    </p>
                    <p className="text-sm text-muted-foreground px-2">Supported: TXT, PDF, DOCX, Images (PNG, JPG), PPTX. Max {MAX_FILE_SIZE_MB}MB.</p>
                </div>
                <Input ref={fileInputRef} id="file-upload-input" type="file" className="hidden" onChange={handleFileChange}
                    accept="image/*,text/plain,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    disabled={isLoading || isProcessingFile}
                />
            </div>
            <div className="space-y-4">
                {file && friendlyFileType && (
                    <Card className="p-3 bg-muted/50">
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2 min-w-0">
                                <FileUp className="w-5 h-5 text-primary shrink-0"/>
                                <span className="font-medium text-sm truncate flex-1">{file.name}</span>
                                <Badge variant="outline" className="text-xs shrink-0">{friendlyFileType}</Badge>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => {setFile(null); setFileDataUriForImagePreview(null); setFriendlyFileType(null); if(fileInputRef.current) fileInputRef.current.value = "";}} disabled={isLoading || isProcessingFile} className="h-7 w-7 shrink-0">
                                <XCircle size={16} className="text-destructive"/>
                            </Button>
                        </div>
                        {fileDataUriForImagePreview && file.type.startsWith('image/') && (
                            <img src={fileDataUriForImagePreview} alt="Preview" className="mt-2 rounded-md max-h-20 object-contain" />
                        )}
                    </Card>
                )}
                 <div className="text-center my-3 text-sm font-medium text-muted-foreground before:content-[''] before:grow before:border-b before:border-border before:mr-3 after:content-[''] after:grow after:border-b after:border-border after:ml-3 flex items-center">OR</div>
                <Input id="text-prompt-input" type="text" placeholder="Enter a topic or paste text here..." value={textPrompt}
                    onChange={(e) => {setTextPrompt(e.target.value); if (e.target.value) {setFile(null); setFileDataUriForImagePreview(null); setFriendlyFileType(null);}}}
                    disabled={isLoading || isProcessingFile} className="text-base py-3"
                />
            </div>
        </div>
      </section>

      <section className="mb-10 w-full">
        <h2 className="text-2xl font-semibold mb-4 text-center sm:text-left">2. Choose Generation Options</h2>
        <Card className="p-6 shadow-sm bg-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                    <Label htmlFor="generationType" className="text-base font-medium">Content Type</Label>
                    <Select value={generationType} onValueChange={(value) => setGenerationType(value as Exclude<GenerationType, "test_result">)} disabled={isLoading || isProcessingFile}>
                        <SelectTrigger id="generationType" className="mt-1"><SelectValue placeholder="Select content type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="test"><FileQuestion className="inline w-4 h-4 mr-2" />Practice Test</SelectItem>
                            <SelectItem value="flashcards"><ListChecks className="inline w-4 h-4 mr-2" />Flashcards</SelectItem>
                            <SelectItem value="note"><StickyNote className="inline w-4 h-4 mr-2" />Notes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {generationType === 'test' && ( <>
                    <div><Label htmlFor="questionType" className="text-base font-medium">Question Type</Label>
                        <Select value={questionType} onValueChange={(value) => setQuestionType(value as QuestionType)} disabled={isLoading || isProcessingFile}>
                            <SelectTrigger id="questionType" className="mt-1"><SelectValue placeholder="Select question type" /></SelectTrigger>
                            <SelectContent><SelectItem value="multipleChoice">Multiple Choice (MCQ)</SelectItem><SelectItem value="descriptive">Descriptive/Subjective</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div><Label htmlFor="numQuestions" className="text-base font-medium">Number of Questions (1-100)</Label><Input id="numQuestions" type="number" value={numQuestions} onChange={(e) => setNumQuestions(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))} min="1" max="100" disabled={isLoading || isProcessingFile} className="mt-1"/></div>
                        <div className="flex flex-col space-y-2 pt-1">
                            <div className="flex items-center space-x-2"><Switch id="blooms-switch" checked={useBloomsTaxonomy} onCheckedChange={setUseBloomsTaxonomy} disabled={isLoading || isProcessingFile}/><Label htmlFor="blooms-switch" className="text-base font-medium flex items-center gap-1.5"><BrainCircuit size={18}/>Use Bloom's Taxonomy</Label></div>
                            {useBloomsTaxonomy && (<Select value={selectedBloomLevel} onValueChange={(value) => setSelectedBloomLevel(value as BloomLevel | typeof GENERAL_DIFFICULTY_SELECT_VALUE )} disabled={isLoading || isProcessingFile || !useBloomsTaxonomy}><SelectTrigger id="bloomLevelSelect"><SelectValue placeholder="Select Bloom's Level"/></SelectTrigger><SelectContent><SelectItem value={GENERAL_DIFFICULTY_SELECT_VALUE}>General Difficulty</SelectItem>{bloomLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select>)}
                        </div>
                    </div>
                </>)}
                {generationType === 'flashcards' && (<div><Label htmlFor="numFlashcards" className="text-base font-medium">Number of Flashcards (1-50)</Label><Input id="numFlashcards" type="number" value={numFlashcards} onChange={(e) => setNumFlashcards(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))} min="1" max="50" disabled={isLoading || isProcessingFile} className="mt-1"/></div>)}
                {generationType === 'note' && (<>
                    <div><Label htmlFor="noteLength" className="text-base font-medium">Note Length</Label><Select value={noteLength} onValueChange={(value) => setNoteLength(value as NoteLength)} disabled={isLoading || isProcessingFile}><SelectTrigger id="noteLength" className="mt-1"><SelectValue placeholder="Select note length" /></SelectTrigger><SelectContent><SelectItem value="short">Short (~3 min read)</SelectItem><SelectItem value="medium">Medium (~7 min read)</SelectItem><SelectItem value="long">Long (~10-12 min read)</SelectItem></SelectContent></Select></div>
                    <div className="md:col-span-2"><ShadcnAlert variant="default"><FlaskConical className="h-4 w-4" /><ShadcnAlertTitle>Note Generation</ShadcnAlertTitle><ShadcnAlertDescription>The AI will generate {noteLength} summary notes. Formatting will be Markdown.</ShadcnAlertDescription></ShadcnAlert></div>
                </>)}
            </div>
        </Card>
      </section>

      <section className="mb-10 text-center w-full">
        <Button onClick={handleSubmit}
            disabled={(!file && !textPrompt.trim()) || isLoading || isSaving || isProcessingFile}
            className="w-full max-w-md mx-auto text-lg py-3.5 px-8 rounded-lg shadow-md hover:shadow-lg transition-shadow" size="lg"
        >
            {isLoading || isProcessingFile ? <Loader2 className="w-6 h-6 mr-2.5 animate-spin" /> : <MessageSquare className="w-6 h-6 mr-2.5" />}
            {isLoading || isProcessingFile ? displayLoadingStep : `Generate ${generationType === "note" ? "Notes" : generationType.charAt(0).toUpperCase() + generationType.slice(1)}`}
        </Button>
        {isProcessingFile && currentJobForDisplay && (
          <div className="mt-4 max-w-lg mx-auto">
            <Progress value={
                currentJobForDisplay.status === 'PENDING_UPLOAD' ? 10 :
                currentJobForDisplay.status === 'PENDING_EXTRACTION' ? 25 :
                currentJobForDisplay.status === 'EXTRACTING' ? 40 :
                currentJobForDisplay.status === 'TEXT_EXTRACTED_PENDING_AI' ? 70 :
                currentJobForDisplay.status === 'AI_GENERATING_CLIENT' ? 85 : 0
            } className="h-2.5" />
            <p className="text-sm text-muted-foreground mt-1.5 flex items-center justify-center gap-2">
                <Clock size={14} className="animate-pulse" /> {currentJobForDisplay.progressMessage}
            </p>
          </div>
        )}
        {error && !isProcessingFile && (
          <ShadcnAlert variant="destructive" className="mt-6 max-w-lg mx-auto text-left">
            <AlertTriangle className="h-4 w-4" />
            <ShadcnAlertTitle>Error</ShadcnAlertTitle>
            <ShadcnAlertDescription>{error}</ShadcnAlertDescription>
          </ShadcnAlert>
        )}
      </section>

        {(!isLoading && !isProcessingFile && (generatedTest || generatedFlashcards || generatedNotes)) && (
          <Card className="mt-8 shadow-xl w-full">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-center gap-3 p-6">
                 <div className="flex-1 text-center sm:text-left">
                    <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-7 h-7 text-green-500"/>
                        {(generationType === "test" && generatedTest?.testTitle) || (generationType === "flashcards" && generatedFlashcards?.title) || (generationType === "note" && generatedNotes?.title)}
                    </CardTitle>
                    <CardDescription>Your {generationType === "note" ? "Notes" : generationType} have been successfully generated.</CardDescription>
                 </div>
                 <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                    <Button variant="default" onClick={() => handleSaveMaterial(
                        (generatedTest || generatedFlashcards || generatedNotes)!,
                        generationType,
                        currentGenerationParamsForSave,
                        currentJobForDisplay?.fileName || (file ? file.name : "Text Prompt"),
                        currentJobForDisplay?.extractedText || textPrompt || null,
                        currentMaterialIdRef.current, // Pass the stored materialId for updates
                        activeJobIdRef.current || undefined
                    )} size="sm" className="gap-1.5" disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />} {isSaving ? "Saving..." : "Save Material"}
                    </Button>
                    <Button variant="outline" onClick={() => handleDownload('json')} size="sm" className="gap-1.5"><Download className="w-4 h-4" /> Download JSON</Button>
                    <Button variant="outline" onClick={() => handleDownload('pdf')} size="sm" className="gap-1.5" disabled={generationType !== 'note'}><Download className="w-4 h-4" /> Download PDF (Notes Only)</Button>
                    {(generationType === 'test' || generationType === 'note') && (<Button variant="outline" onClick={handleShare} size="sm" className="gap-1.5"><Share2 className="w-4 h-4" /> Share</Button>)}
                 </div>
            </CardHeader>
            <CardContent className="p-6">
              {generationType === 'test' && generatedTest && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-2">Generated Questions:</h3>
                    {generatedTest.questions.length === 0 ? (<p className="text-muted-foreground text-center py-4">No questions generated.</p>) : (
                        <ul className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                            {generatedTest.questions.map((q, index) => (
                            <li key={index} className="p-4 rounded-md bg-muted/50 border">
                                <div className="font-medium text-foreground mb-2">Q {index + 1}: <MathRenderer content={q.questionText} /></div>
                                {(q as MCQQuestion).options ? (<>
                                    <ul className="space-y-1 pl-4 mb-2">{(q as MCQQuestion).options.map((opt, i) => (<li key={i} className={`text-sm ${i === (q as MCQQuestion).correctOptionIndex ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted-foreground'}`}>{String.fromCharCode(65 + i)}. <MathRenderer content={opt}/></li>))}</ul>
                                    {(q as MCQQuestion).explanation && (<div className="text-xs text-muted-foreground/80 mt-1">Expl: <MathRenderer content={(q as MCQQuestion).explanation!} /></div>)}
                                    {(q as MCQQuestion).bloomLevel && (<Badge variant="outline" className="mt-1 text-xs">Bloom: {(q as MCQQuestion).bloomLevel}</Badge>)}
                                </>) : (<><div className="text-sm text-muted-foreground italic mb-1">(Descriptive)</div>{(q as DescriptiveQuestion).bloomLevel && (<Badge variant="outline" className="mt-1 text-xs">Bloom: {(q as DescriptiveQuestion).bloomLevel}</Badge>)}</>)}
                            </li>))}
                        </ul>)}
                </div>)}
              {generationType === 'flashcards' && generatedFlashcards && (generatedFlashcards.flashcards.length === 0 ? (<p className="text-muted-foreground text-center py-4">No flashcards generated.</p>) : (<FlashcardViewer flashcardsOutput={generatedFlashcards} />))}
              {generationType === 'note' && generatedNotes && (generatedNotes.notesContent.trim() === "" || generatedNotes.notesContent.toLowerCase().includes("no summary could be generated") ? (<p className="text-muted-foreground text-center py-4">No notes generated.</p>) : (<ScrollArea className="max-h-[70vh] p-1"><div className="prose dark:prose-invert max-w-none leading-relaxed bg-muted/30 p-4 rounded-md border"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{generatedNotes.notesContent}</ReactMarkdown></div></ScrollArea>))}
            </CardContent>
             <CardFooter className="p-6">
                <ShadcnAlert className="w-full"><Lightbulb className="w-4 h-4" /><ShadcnAlertTitle>Next Steps</ShadcnAlertTitle>
                  <ShadcnAlertDescription className="space-y-2"><p>Review your content. Save, download, or share tests/notes.</p>
                    {generationType === 'test' && generatedTest && generatedTest.questions.some(q => (q as MCQQuestion).options) && (<Button onClick={handleTakeTestInArena} size="sm" className="mt-2 gap-1.5"><FlaskConical className="w-4 h-4"/> Take Test</Button>)}
                  </ShadcnAlertDescription>
                </ShadcnAlert>
             </CardFooter>
          </Card>
        )}
    </div>
  );
}

