"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNoteStore } from "@/store/noteStore";
import { CheckCircle, Copy, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export function SummaryModal() {
  const { summaryModalContent, closeSummaryModal, setNoteSummary } = useNoteStore();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  if (!summaryModalContent) return null;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(summaryModalContent.summary)
      .then(() => {
        setIsCopied(true);
        toast({ title: "Summary Copied!", description: "The summary has been copied to your clipboard." });
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy summary to clipboard." });
      });
  };

  const handleAddToNote = () => {
    setNoteSummary(summaryModalContent.noteId, summaryModalContent.summary);
    toast({ title: "Summary Saved", description: "The summary has been saved with the note." });
    closeSummaryModal();
  };

  return (
    <Dialog open={!!summaryModalContent} onOpenChange={(isOpen) => !isOpen && closeSummaryModal()}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Summary for: {summaryModalContent.title}</DialogTitle>
          <DialogDescription>
            AI-generated summary of your note.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] my-4 p-4 border rounded-md bg-muted/30">
          <p className="text-base whitespace-pre-wrap">{summaryModalContent.summary}</p>
        </ScrollArea>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleCopyToClipboard}>
            {isCopied ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
            {isCopied ? "Copied!" : "Copy Summary"}
          </Button>
          <Button type="button" variant="default" onClick={handleAddToNote}>
            Save Summary to Note
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              <XCircle className="mr-2 h-4 w-4" />
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
