
"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, StickyNote, Loader2, Share2 } from 'lucide-react';
import type { GenerateNotesOutput } from '@/ai/flows/generate-notes-flow'; // Updated type
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';


interface SharedNotesClientProps {
  noteId: string;
}

export default function SharedNotesClient({ noteId }: SharedNotesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [noteData, setNoteData] = useState<GenerateNotesOutput | null>(null); // Updated type
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionKey, setCurrentSessionKey] = useState<string | null>(null);

  useEffect(() => {
    const dataSource = searchParams.get('dataSource');
    const key = searchParams.get('key');

    if (dataSource === 'session' && key && typeof window !== 'undefined') {
        try {
            const storedData = sessionStorage.getItem(key);
            if (storedData) {
                const parsedData = JSON.parse(storedData) as GenerateNotesOutput; // Updated type
                setNoteData(parsedData);
                setCurrentSessionKey(key); 
            } else {
                setError("Shared notes data expired or not found in session.");
                toast({
                    title: "Error Loading Notes",
                    description: "The shared notes session may have expired.",
                    variant: "destructive",
                });
            }
        } catch (e) {
            console.error("Failed to parse shared notes data from session:", e);
            setError("The shared notes link is invalid or corrupted.");
            toast({
                title: "Error Loading Notes",
                description: "The notes data could not be loaded from the link.",
                variant: "destructive",
            });
        }
    } else {
        const dataString = searchParams.get('data');
        if (dataString) {
            console.warn("Loading notes data from URL parameter is deprecated. Use session storage method.");
            try {
                const parsedData = JSON.parse(decodeURIComponent(dataString)) as GenerateNotesOutput; // Updated type
                setNoteData(parsedData);
            } catch (e) {
                console.error("Failed to parse shared notes data from URL param:", e);
                setError("The shared notes link is invalid or corrupted (URL data).");
                toast({
                    title: "Error Loading Notes",
                    description: "The notes data could not be loaded from the URL.",
                    variant: "destructive",
                });
            }
        } else {
          setError("No notes data found in the link.");
          toast({
            title: "Missing Notes Data",
            description: "The shared link does not contain any notes information.",
            variant: "destructive",
          });
        }
    }
    setIsLoading(false);
  }, [searchParams, toast]);

  const handleCopyToClipboard = () => {
    if (typeof window !== "undefined") {
        let shareUrl = window.location.href;
        if (currentSessionKey && !window.location.search.includes('dataSource=session')) {
            shareUrl = `${window.location.origin}/view-notes/${noteId}?dataSource=session&key=${currentSessionKey}`;
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
        <p className="text-lg text-muted-foreground">Loading shared notes...</p>
      </div>
    );
  }

  if (error || !noteData) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
        <h2 className="text-2xl font-semibold mb-2">Could Not Load Notes</h2>
        <p className="text-muted-foreground mb-6">{error || "An unknown error occurred."}</p>
        <Button asChild>
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              {/* Title from metadata or from content if no H1 in markdown */}
              <CardTitle className="text-2xl md:text-3xl font-bold text-primary mb-1">
                {noteData.title || "Shared Notes"} 
              </CardTitle>
              <CardDescription>
                You've received shared notes. Review the content below.
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={handleCopyToClipboard} aria-label="Copy share link">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {noteData.notesContent ? ( // Updated field name
            <div className="p-4 rounded-md bg-muted/50 prose dark:prose-invert max-w-none leading-relaxed">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {noteData.notesContent}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground">These notes appear to be empty.</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
          <Button asChild variant="default" size="lg">
            <Link href="/ai-content-generator">Generate Your Own Content</Link>
          </Button>
           <Button asChild variant="outline" size="lg">
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    