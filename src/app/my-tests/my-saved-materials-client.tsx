
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert as ShadcnAlert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription } from '@/components/ui/alert';

import { useToast } from '@/hooks/use-toast';
import type { SavedContentItem, GenerationType, TestScore } from '@/app/ai-content-generator/ai-content-generator-client';
import type {
  GeneratePracticeTestOutput, MCQQuestion, TestQuestion,
  GenerateNotesOutput,
  GenerateFlashcardsOutput
} from '@/ai/flows';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useDebounce } from '@/hooks/use-debounce';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MathRenderer from '@/components/math-renderer';
import { supabase } from '@/lib/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  Loader2,
  FolderOpen,
  Search,
  FileText,
  StickyNote,
  BookOpenCheck,
  Upload,
  View,
  Play,
  Share2,
  Download,
  Trash2,
  Flag,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RefreshCcw,
  Zap,
  ServerIcon,
  FileWarning
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type ActiveTab = "tests" | "notes" | "flashcards";

const displayLimitOptions = [
  { value: 9, label: '9 Items' },
  { value: 15, label: '15 Items' },
  { value: 30, label: '30 Items' },
  { value: 45, label: '45 Items' },
  { value: 60, label: '60 Items' },
  { value: 'All', label: 'All Items' },
];

const FlashcardModalViewer: React.FC<{ flashcardsOutput: GenerateFlashcardsOutput, parentTitle?: string }> = ({ flashcardsOutput, parentTitle }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcardsOutput]);

  if (!flashcardsOutput || !flashcardsOutput.flashcards || flashcardsOutput.flashcards.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No flashcards to display.</p>;
  }
  const card = flashcardsOutput.flashcards[currentIndex];

  return (
    <>
      <DialogHeader className="p-6 pb-2 text-center border-b">
        <DialogTitle>{parentTitle || flashcardsOutput.title || "Flashcards"}</DialogTitle>
        <DialogDescription>
          Card {currentIndex + 1} of {flashcardsOutput.flashcards.length}. Click card to flip.
        </DialogDescription>
      </DialogHeader>
      <div className="px-4 py-6 flex-1 overflow-y-auto">
        <div className="perspective-1000px w-full md:max-w-lg mx-auto">
          <div
            className={`relative w-full min-h-[18rem] md:min-h-[20rem] h-auto transform-style-preserve-3d transition-transform duration-700 ease-in-out ${isFlipped ? 'rotate-y-180' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)} role="button" tabIndex={0} aria-label="Flashcard flip"
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? setIsFlipped(!isFlipped) : null)}
          >
            <Card className="absolute w-full h-full backface-hidden flex flex-col justify-center items-center text-center p-4 md:p-6 cursor-pointer overflow-hidden bg-card ring-1 ring-border">
              <div className="flex-grow flex items-center justify-center overflow-y-auto py-2">
                <MathRenderer content={card.front} className="text-lg md:text-xl font-medium text-card-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-auto pt-2">(Question)</p>
            </Card>
            <Card className="absolute w-full h-full backface-hidden rotate-y-180 flex flex-col justify-center items-center text-center p-4 md:p-6 cursor-pointer overflow-hidden bg-secondary ring-1 ring-border">
              <div className="flex-grow flex items-center justify-center overflow-y-auto py-2">
                <MathRenderer content={card.back} className="text-md md:text-lg text-secondary-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-auto pt-2">(Answer)</p>
            </Card>
          </div>
        </div>
        <div className="flex justify-between items-center mt-6">
          <Button onClick={() => { setIsFlipped(false); setCurrentIndex(i => Math.max(i - 1, 0)) }} disabled={currentIndex === 0} variant="outline" size="icon" className="rounded-full p-2 hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Previous flashcard">
            <ChevronLeft size={20} />
          </Button>
          <Button onClick={() => setIsFlipped(f => !f)} variant="ghost" size="sm" className="gap-2" aria-label="Flip current card">
            <RotateCcw size={16} /> Flip Card
          </Button>
          <Button
            onClick={() => { setIsFlipped(false); setCurrentIndex(i => Math.min(i + 1, flashcardsOutput.flashcards.length - 1)) }}
            disabled={currentIndex === flashcardsOutput.flashcards.length - 1}
            variant="outline" size="icon" className="rounded-full p-2 hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Next flashcard">
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>
      <DialogFooter className="p-6 pt-4 border-t">
        <DialogClose asChild>
          <Button type="button" variant="outline" className="w-full">Close</Button>
        </DialogClose>
      </DialogFooter>
    </>
  );
};

export default function MySavedMaterialsClient() {
  const [allItems, setAllItems] = useState<SavedContentItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('tests');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [displayLimit, setDisplayLimit] = useState<number | 'All'>(15);
  const [selectedItemForView, setSelectedItemForView] = useState<SavedContentItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [itemToFlag, setItemToFlag] = useState<SavedContentItem | null>(null);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [isFlagging, setIsFlagging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authIsLoading, session } = useAuth();
  const importFileRef = useRef<HTMLInputElement>(null);

  const loadAllSavedItemsFromCloud = useCallback(async (isRefresh = false) => {
    if (!user || !session) {
      setIsLoadingItems(false); setIsLoadingPage(false);
      return;
    }
    setIsLoadingItems(true);
    if (isRefresh) {
      toast({ title: "Refreshing Materials...", description: "Fetching the latest from the cloud.", duration: 2000 });
    }

    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('getSavedMaterials');
      if (functionError) {
        const errDesc = functionError instanceof FunctionsHttpError ? (await functionError.context.json().catch(() => ({})))?.error || functionError.message : functionError.message;
        throw new Error(errDesc || "Cloud fetch failed.");
      }
      if (functionData && functionData.success && Array.isArray(functionData.materials)) {
        const cloudMaterials: SavedContentItem[] = functionData.materials.map((m: any) => ({
          id: m.id, type: m.type as GenerationType, title: m.title,
          content: m.content, 
          status: m.status, 
          savedAt: m.created_at || m.updated_at || new Date().toISOString(),
          fileInfo: m.source_file_info, sourceTextPrompt: m.source_text_prompt,
          generationParams: m.generation_params, user_id: m.user_id,
          storagePath: m.storage_path, isLocal: false, cloudId: m.id,
        }));
        setAllItems(cloudMaterials.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
        if(isRefresh || !allItems.length) { // Only toast on refresh or initial load
           toast({ title: "Materials Loaded", description: `${cloudMaterials.length} item(s) fetched.`, variant: "default", duration: 3000 });
        }
      } else {
        throw new Error(functionData?.error || "Failed to retrieve materials or unexpected data structure.");
      }
    } catch (error: any) {
      console.error("Error fetching/processing cloud materials:", error);
      toast({ title: "Cloud Sync Error", description: `Could not fetch cloud data: ${error.message}.`, variant: "destructive", duration: 5000 });
    } finally {
      setIsLoadingItems(false); setIsLoadingPage(false);
    }
  }, [user, session, toast, allItems.length]); // allItems.length to avoid toast on every internal re-render

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/auth/signin'); setIsLoadingPage(false);
    } else if (isAuthenticated && user?.id) {
      loadAllSavedItemsFromCloud();
    } else if (!authIsLoading) {
      setIsLoadingPage(false);
    }
  }, [isAuthenticated, authIsLoading, user?.id, loadAllSavedItemsFromCloud, router]);

  const filteredItems = useMemo(() => {
    let itemsToFilter = allItems;
    const tabTypeMapping: Record<ActiveTab, GenerationType | GenerationType[]> = {
      tests: ['test', 'test_result'],
      notes: 'note',
      flashcards: 'flashcards',
    };
    const targetTypes = tabTypeMapping[activeTab];
    itemsToFilter = allItems.filter(item =>
      Array.isArray(targetTypes) ? targetTypes.includes(item.type) : item.type === targetTypes
    );
    const term = debouncedSearchTerm.toLowerCase().trim();
    if (!term) return itemsToFilter;
    return itemsToFilter.filter(item =>
      item.title.toLowerCase().includes(term) ||
      (item.fileInfo?.name || '').toLowerCase().includes(term) ||
      (item.sourceTextPrompt || '').toLowerCase().includes(term) ||
      (item.status || '').toLowerCase().includes(term)
    );
  }, [allItems, activeTab, debouncedSearchTerm]);

  const itemsToDisplay = useMemo(() => {
    return displayLimit === 'All' ? filteredItems : filteredItems.slice(0, displayLimit as number);
  }, [filteredItems, displayLimit]);

  const handleDeleteItem = async () => {
    if (!itemToDeleteId) return;
    setIsDeleting(true);
    const itemToDelete = allItems.find(item => item.id === itemToDeleteId);
    toast({ title: "Deleting...", description: `Attempting to delete "${itemToDelete?.title || 'item'}".`, duration: 2000 });

    try {
      const { data: deleteData, error: deleteError } = await supabase.functions.invoke('deleteMaterial', {
        body: { materialId: itemToDeleteId },
      });
      if (deleteError || !deleteData?.success) {
        const errMsg = deleteError instanceof FunctionsHttpError ? (await deleteError.context.json().catch(()=>({})))?.error || deleteError.message : deleteError?.message || deleteData?.error || "Failed to delete from cloud.";
        throw new Error(errMsg);
      }
      toast({ title: "Deleted from Cloud!", description: `"${itemToDelete?.title || 'Item'}" successfully deleted.` });
      setAllItems(prevItems => prevItems.filter(item => item.id !== itemToDeleteId));
      if (selectedItemForView?.id === itemToDeleteId) {
        setIsViewModalOpen(false); setSelectedItemForView(null);
      }
    } catch (cloudError: any) {
      toast({ title: "Cloud Delete Failed", description: cloudError.message, variant: "destructive" });
    } finally {
      setIsDeleting(false); setItemToDeleteId(null);
    }
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsLoadingItems(true);
        toast({ title: "Importing File...", description: `Processing ${file.name}.` });
        const importedData = JSON.parse(e.target?.result as string);
        let itemsToProcess: Partial<SavedContentItem>[] = Array.isArray(importedData) ? importedData : [importedData];

        let successfullySavedToCloudCount = 0;
        for (const item of itemsToProcess) {
          if (!item.title || !item.type ) { // Content can be null for placeholder during complex file upload
            console.warn("Skipping invalid item during import (missing title or type):", item);
            continue;
          }
          const payloadForCloud: Partial<SavedContentItem> = {
            title: item.title, type: item.type, content: item.content || null, // Allow null content
            status: item.status || "COMPLETED", 
            sourceFileInfo: item.fileInfo, sourceTextPrompt: item.sourceTextPrompt,
            generationParams: item.generationParams, isPublic: item.isPublic, tags: item.tags,
          };
          const { data: cloudSaveData, error: cloudSaveError } = await supabase.functions.invoke('saveMaterial', { body: payloadForCloud });
          if (cloudSaveError || !cloudSaveData?.success) {
            const errMsg = cloudSaveError instanceof FunctionsHttpError ? (await cloudSaveError.context.json().catch(()=>({})))?.error || cloudSaveError.message : cloudSaveError?.message || cloudSaveData?.error || "Cloud save failed for item.";
            toast({ title: "Import Sync Error", description: `Item "${item.title}" failed to sync: ${errMsg}`, variant: "destructive", duration: 4000 });
          } else {
            successfullySavedToCloudCount++;
          }
        }
        await loadAllSavedItemsFromCloud(true); // Refresh after import attempts
        toast({ title: "Import Complete", description: `${itemsToProcess.length} item(s) processed. ${successfullySavedToCloudCount} synced to cloud.` });
      } catch (error: any) {
        toast({ title: "Import Error", description: error.message || "Could not process JSON.", variant: "destructive" });
      } finally {
        setIsLoadingItems(false);
        if (importFileRef.current) importFileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleShareItem = (item: SavedContentItem) => {
    if (!item.content || !item.id || (item.status && item.status !== "COMPLETED")) {
      toast({ title: "Cannot Share", description: "Item content is missing, incomplete, or has no cloud ID.", variant: "destructive" }); return;
    }
    const contentToStore = JSON.stringify(item.content);
    let shareType = item.type === 'test_result' ? 'test' : (item.type === 'note' ? 'notes' : item.type);
    if (shareType === 'flashcards') {
      toast({ title: "Share Flashcards (Coming Soon)", variant: "default" }); return;
    }
    const shareKey = `shared-${shareType}-${item.id}`;
    sessionStorage.setItem(shareKey, contentToStore);
    const shareableLink = `${window.location.origin}/${shareType === 'test' ? 'test' : 'view-notes'}/${item.id}?dataSource=session&key=${shareKey}`;
    navigator.clipboard.writeText(shareableLink)
      .then(() => toast({ title: "Link Copied!", description: `Shareable link for "${item.title}" copied.` }))
      .catch(() => toast({ title: "Copy Failed", variant: "destructive" }));
  };

  const handleTakeTest = (item: SavedContentItem) => {
    if (!item.content || (item.type !== 'test' && item.type !== 'test_result') || (item.status && item.status !== "COMPLETED")) {
      toast({ title: "Not a Valid Test", description: "Test is not available or incomplete.", variant: "destructive" }); return;
    }
    let testData: GeneratePracticeTestOutput = item.type === 'test' ? item.content as GeneratePracticeTestOutput : {
      testTitle: `Retake: ${item.title}`,
      questions: (item.content as TestScore).answers?.map(a => a.question).filter(Boolean) as TestQuestion[] || []
    };
    if (!testData.questions?.length || !testData.questions.some(q => (q as MCQQuestion).options)) {
      toast({ title: "No MCQs", description: "Test Arena requires MCQs.", variant: "destructive" }); return;
    }
    testData.questions = testData.questions.filter(q => (q as MCQQuestion).options);
    const testKey = `cbt-test-data-${item.id}-${Date.now()}`;
    sessionStorage.setItem(testKey, JSON.stringify(testData));
    router.push(`/cbt?testDataSource=session&testKey=${testKey}`);
  };

  const handleFlagItem = async (itemToFlagData: SavedContentItem) => {
    if (!user || !session) { toast({ title: "Authentication Required", variant: "destructive" }); return; }
    if (!itemToFlagData.id) { toast({ title: "Cannot Flag", description: "Item has no cloud ID." }); return; }
    setItemToFlag(itemToFlagData); setIsFlagging(true);
    toast({ title: "Flagging...", description: `Submitting flag for "${itemToFlagData.title}".`, duration: 2000 });
    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('flagMaterial', {
        body: { materialId: itemToFlagData.id, reason: "Flagged from My Saved Materials" }
      });
      if (funcError || !funcData?.success) {
        const errMsg = funcError instanceof FunctionsHttpError ? (await funcError.context.json().catch(()=>({})))?.error || funcError.message : funcError?.message || funcData?.error || "Server error.";
        if ((funcError as any)?.context?.json?.().code === '23505' || funcData?.code === '23505' ||errMsg.toLowerCase().includes('already flagged') || errMsg.toLowerCase().includes('unique constraint')) { // Adjusted check for unique constraint
          toast({ title: "Already Flagged", description: "You have already flagged this material.", variant: "default" });
          return; 
        }
        throw new Error(errMsg);
      }
      toast({ title: "Material Flagged", description: `"${itemToFlagData.title}" flagged for review.` });
    } catch (err: any) {
      toast({ title: "Flagging Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsFlagging(false); setItemToFlag(null);
    }
  };

  const renderItemCard = (item: SavedContentItem) => {
    let IconComponent: React.ElementType = FileText;
    let itemTypeDisplay = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    if (item.type === 'note') { IconComponent = StickyNote; itemTypeDisplay = 'Notes'; }
    else if (item.type === 'flashcards') { IconComponent = BookOpenCheck; itemTypeDisplay = 'Flashcards'; }
    else if (item.type === 'test_result') { IconComponent = FileText; itemTypeDisplay = 'Test Result'; }

    let contentPreview;
    const isProcessing = item.status && item.status !== "COMPLETED" && item.status !== "EXTRACTION_FAILED" && item.status !== "AI_PROCESSING_FAILED" && item.status !== "EXTRACTION_UNSUPPORTED";
    const hasErrorStatus = item.status && (item.status === "EXTRACTION_FAILED" || item.status === "AI_PROCESSING_FAILED" || item.status === "EXTRACTION_UNSUPPORTED");
    const hasValidContent = item.content && !('error' in (item.content as object)) && !isProcessing && !hasErrorStatus;

    if (hasValidContent) {
      if (item.type === 'test') contentPreview = <p className="text-sm text-muted-foreground">{(item.content as GeneratePracticeTestOutput).questions?.length || 0} question(s)</p>;
      else if (item.type === 'test_result') {
        const score = item.content as TestScore;
        contentPreview = <p className="text-sm text-muted-foreground">Score: {score.score}/{score.totalQuestions} ({score.percentage?.toFixed(1)}%)</p>;
      }
      else if (item.type === 'note') contentPreview = <div className="prose prose-sm dark:prose-invert max-w-full break-words line-clamp-3 text-muted-foreground"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{(item.content as GenerateNotesOutput).notesContent || ""}</ReactMarkdown></div>;
      else if (item.type === 'flashcards') contentPreview = <p className="text-sm text-muted-foreground">{(item.content as GenerateFlashcardsOutput).flashcards?.length || 0} flashcard(s)</p>;
    } else if (isProcessing) {
      contentPreview = <p className="text-sm text-blue-500 italic flex items-center gap-1"><Loader2 size={14} className="animate-spin"/>Status: {item.status!.replace(/_/g, ' ').toLowerCase()}</p>;
    } else if (hasErrorStatus) {
       contentPreview = <p className="text-sm text-red-500 italic flex items-center gap-1"><FileWarning size={14}/>Error: {item.status!.replace(/_/g, ' ').toLowerCase()}</p>;
    } else if (item.content && typeof item.content === 'object' && 'error' in item.content) {
       contentPreview = <p className="text-sm text-red-500 italic flex items-center gap-1"><FileWarning size={14}/>Error: {(item.content as any).error}</p>;
    } else {
       contentPreview = <p className="text-sm text-muted-foreground italic">Content not available or processing.</p>;
    }


    return (
      <Card key={item.id} className="w-full flex flex-col h-full overflow-hidden hover:shadow-xl transition-shadow duration-200 ease-in-out bg-card">
        <CardHeader className="p-4">
          <CardTitle className="flex items-start gap-2 text-lg">
            <IconComponent className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <span className="flex-1 truncate" title={item.title}>{item.title}</span>
             <Badge variant={item.isLocal ? "secondary" : "outline"} className={`text-xs ml-auto shrink-0 ${item.isLocal ? 'border-blue-500 text-blue-600' : 'border-green-500 text-green-600'}`}>{item.isLocal ? <ServerIcon size={12} className="mr-1"/> : <ServerIcon size={12} className="mr-1"/>}{item.isLocal ? "Local" : "Cloud"}</Badge>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Type: <span className="capitalize">{itemTypeDisplay}</span> | Saved: {new Date(item.savedAt).toLocaleDateString()}
            {item.fileInfo && <span className="block truncate">Source File: {item.fileInfo.name}</span>}
            {item.sourceTextPrompt && !item.fileInfo && <span className="block truncate">Source: Text Prompt</span>}
             {item.status && <Badge variant={hasErrorStatus ? "destructive" : (isProcessing ? "secondary" : "default")} className="mt-1 text-xs capitalize">{item.status.replace(/_/g, ' ').toLowerCase()}</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-4 pt-0 space-y-2">{contentPreview}</CardContent>
        <CardFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 p-4">
          <Button size="sm" onClick={() => { setSelectedItemForView(item); setIsViewModalOpen(true); }} className="w-full gap-1.5" disabled={!hasValidContent}>
            <View size={16} /> View/Study
          </Button>
          {(item.type === 'test' || item.type === 'test_result') && (
            <Button size="sm" variant="secondary" onClick={() => handleTakeTest(item)} className="w-full gap-1.5" disabled={!hasValidContent}>
              <Play size={16} /> Take Test
            </Button>
          )}
          {(item.type === 'test' || item.type === 'note') && (
            <Button size="sm" variant="outline" onClick={() => handleShareItem(item)} className="w-full gap-1.5" disabled={!hasValidContent}>
              <Share2 size={16} /> Share
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { 
              const jsonString = JSON.stringify(item.content, null, 2);
              const blob = new Blob([jsonString], { type: 'application/json' });
              const href = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = href; link.download = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'material'}.json`; 
              document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(href);
              toast({ title: "JSON Downloaded" });
            }} className="w-full gap-1.5" disabled={!hasValidContent}>
            <Download size={16} /> Download JSON
          </Button>
           <Button variant="outline" size="sm" className="w-full gap-1.5 sm:col-span-2" disabled={item.type !== 'note' || !hasValidContent}
            onClick={() => toast({ title: "PDF Download (Coming Soon)" })}>
            <Download size={16} /> Download PDF (Notes Only)
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleFlagItem(item)} disabled={(isFlagging && itemToFlag?.id === item.id) || item.isLocal || isProcessing || hasErrorStatus} className="w-full gap-1.5">
            {(isFlagging && itemToFlag?.id === item.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag size={16} />} Flag
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full gap-1.5 sm:col-span-2">
                <Trash2 size={16} /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete &quot;{item.title}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>This will attempt to remove the item from the cloud. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {setItemToDeleteId(item.id); handleDeleteItem();}} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                  {isDeleting && itemToDeleteId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    );
  };

   const renderGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      {itemsToDisplay.map(renderItemCard)}
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full w-full text-center py-10 bg-muted/30 rounded-lg border border-dashed flex-1">
      <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {debouncedSearchTerm.trim() ? `No ${activeTab} match "${debouncedSearchTerm}"` : `Your saved ${activeTab} will appear here.`}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {debouncedSearchTerm.trim() ? "Try adjusting your search." : "Generate some new content or import existing materials!"}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-sm">
        <Button onClick={() => router.push('/ai-content-generator')} variant="default" size="sm" className="gap-1.5 w-full"><Zap size={16}/>Generate New</Button>
        <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()} className="gap-1.5 w-full"><Upload size={16}/>Import JSON</Button>
      </div>
    </div>
  );

  if (authIsLoading || isLoadingPage) {
    return <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background p-8"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Loading your materials...</p></div>;
  }

  return (
    <div className="flex flex-col w-full h-full">
      <header className="w-full flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><FolderOpen className="w-7 h-7"/>My Saved Materials</h1>
            <p className="text-sm text-muted-foreground mt-1">Browse, manage, and study your generated content.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
            <Button onClick={() => router.push('/ai-content-generator')} variant="default" size="sm" className="gap-1.5"><Zap size={16}/>Generate New</Button>
            <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()} className="gap-1.5"><Upload size={16}/>Import JSON</Button>
            <Button variant="outline" size="sm" onClick={() => loadAllSavedItemsFromCloud(true)} disabled={isLoadingItems} className="gap-1.5">{isLoadingItems ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw size={16}/>}Refresh</Button>
            <input type="file" ref={importFileRef} onChange={handleImportFileChange} className="hidden" accept=".json"/>
          </div>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-8 mt-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input type="search" placeholder="Search by title, source, status..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full h-11" />
        </div>
      </div>

       <div className="w-full px-4 sm:px-6 lg:px-8 mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <Select value={String(displayLimit)} onValueChange={(value) => setDisplayLimit(value === 'All' ? 'All' : parseInt(value))}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm"><SelectValue placeholder="Items per page" /></SelectTrigger>
          <SelectContent>{displayLimitOptions.map(o => <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-2 sm:mt-0">Showing {itemsToDisplay.length} of {filteredItems.length} {activeTab}</p>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 mt-4 mb-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto items-stretch rounded-lg bg-muted p-1 text-muted-foreground shadow-sm">
            <TabsTrigger value="tests" className="flex-1 gap-1.5 py-2.5 text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md"><FileText size={16}/>Tests & Results</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 gap-1.5 py-2.5 text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md"><StickyNote size={16}/>Notes</TabsTrigger>
            <TabsTrigger value="flashcards" className="flex-1 gap-1.5 py-2.5 text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md"><BookOpenCheck size={16}/>Flashcards</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <main className="flex-1 w-full overflow-y-auto px-4 sm:px-6 lg:px-8 pb-6">
        <Tabs value={activeTab} className="w-full h-full">
          <TabsContent value="tests" className="w-full h-full">{isLoadingItems ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div> : itemsToDisplay.length === 0 ? renderEmptyState() : renderGrid()}</TabsContent>
          <TabsContent value="notes" className="w-full h-full">{isLoadingItems ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div> : itemsToDisplay.length === 0 ? renderEmptyState() : renderGrid()}</TabsContent>
          <TabsContent value="flashcards" className="w-full h-full">{isLoadingItems ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div> : itemsToDisplay.length === 0 ? renderEmptyState() : renderGrid()}</TabsContent>
        </Tabs>
      </main>

      <Dialog open={isViewModalOpen && !!selectedItemForView} onOpenChange={(isOpen) => { setIsViewModalOpen(isOpen); if (!isOpen) setSelectedItemForView(null); }}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0">
          {selectedItemForView?.type === 'flashcards' && selectedItemForView.content && typeof selectedItemForView.content === 'object' && 'flashcards' in selectedItemForView.content && (
            <FlashcardModalViewer parentTitle={selectedItemForView.title} flashcardsOutput={selectedItemForView.content as GenerateFlashcardsOutput} />
          )}
          {(selectedItemForView?.type === 'test' || selectedItemForView?.type === 'test_result') && selectedItemForView.content && typeof selectedItemForView.content === 'object' && !('error' in selectedItemForView.content) && (() => {
             let questionsToDisplay: (TestQuestion | undefined)[] = [];
             let testTitleToDisplay = selectedItemForView.title;
             if (selectedItemForView.type === 'test') {
                 questionsToDisplay = (selectedItemForView.content as GeneratePracticeTestOutput).questions || [];
                 testTitleToDisplay = (selectedItemForView.content as GeneratePracticeTestOutput).testTitle || selectedItemForView.title;
             } else { 
                 questionsToDisplay = (selectedItemForView.content as TestScore).answers?.map(a => a.question) || [];
                 testTitleToDisplay = (selectedItemForView.content as TestScore).testTitle || selectedItemForView.title;
             }
             return (
                <>
                  <DialogHeader className="p-6 pb-2 text-center border-b"><DialogTitle>{testTitleToDisplay}</DialogTitle></DialogHeader>
                  <ScrollArea className="flex-1 overflow-y-auto px-6 max-h-[calc(90vh-200px)]"><ul className="space-y-4 py-4">{questionsToDisplay.map((q, index) => q && (<li key={index} className="p-3 border rounded-md bg-muted/30"><div className="font-medium mb-1">Q{index + 1}: <MathRenderer content={(q as MCQQuestion).questionText} /></div>{ (q as MCQQuestion).options && (<ul className="space-y-1 pl-2 text-sm text-muted-foreground">{(q as MCQQuestion).options.map((opt, i)=><li key={i} className={(q as MCQQuestion).correctOptionIndex === i ? "text-green-600 font-semibold": "" }>{String.fromCharCode(65+i)}. <MathRenderer content={opt}/></li>)}</ul>)}{(q as MCQQuestion).explanation && <p className="text-xs mt-1 text-muted-foreground/80">Expl: <MathRenderer content={(q as MCQQuestion).explanation!}/></p>}</li>))}</ul></ScrollArea>
                  <DialogFooter className="p-6 pt-4 border-t"><DialogClose asChild><Button type="button" variant="outline" className="w-full">Close</Button></DialogClose></DialogFooter>
                </>
             );
          })()}
          {selectedItemForView?.type === 'note' && selectedItemForView.content && typeof selectedItemForView.content === 'object' && 'notesContent' in selectedItemForView.content && (
            <>
              <DialogHeader className="p-6 pb-2 text-center border-b"><DialogTitle>{selectedItemForView.title}</DialogTitle></DialogHeader>
              <ScrollArea className="flex-1 overflow-y-auto px-6 max-h-[calc(90vh-200px)]"><div className="prose dark:prose-invert max-w-none p-4 my-4 rounded-md border bg-muted/30"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{(selectedItemForView.content as GenerateNotesOutput).notesContent || ""}</ReactMarkdown></div></ScrollArea>
              <DialogFooter className="p-6 pt-4 border-t"><DialogClose asChild><Button type="button" variant="outline" className="w-full">Close</Button></DialogClose></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
