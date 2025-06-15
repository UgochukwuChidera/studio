"use client";

import type { Note } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit3, Trash2, Wand2, MoreVertical, CalendarDays, FileText } from "lucide-react";
import { useNoteStore } from "@/store/noteStore";
import { summarizeNote } from "@/ai/flows/summarize-note";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const { openFormModal, openConfirmationModal, openSummaryModal, setIsLoadingSummary, isLoadingSummary } = useNoteStore();
  const { toast } = useToast();

  const handleDelete = () => {
    openConfirmationModal(note.id, () => {
      // The actual delete logic is in the store, triggered by the confirmation dialog
      // This is just to satisfy the onConfirm type, store handles actual deletion through its `deleteNote`
    });
  };

  const handleSummarize = async () => {
    setIsLoadingSummary(true);
    try {
      const result = await summarizeNote({ noteContent: note.content });
      openSummaryModal(note.id, note.title, result.summary);
    } catch (error) {
      console.error("Failed to summarize note:", error);
      toast({
        variant: "destructive",
        title: "Summarization Failed",
        description: "Could not generate summary for this note.",
      });
    } finally {
      setIsLoadingSummary(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };


  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden bg-card">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-headline text-primary-foreground mb-1">{note.title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary-foreground">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="shadow-lg rounded-md">
              <DropdownMenuItem onClick={() => openFormModal(note)} className="cursor-pointer">
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSummarize} disabled={isLoadingSummary} className="cursor-pointer">
                <Wand2 className="mr-2 h-4 w-4" />
                {isLoadingSummary ? "Summarizing..." : "Summarize"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
           <CalendarDays className="h-3 w-3" /> Last updated: {formatDate(note.updatedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <p className="line-clamp-4 text-sm text-foreground/80 leading-relaxed">
          {note.content}
        </p>
        {note.summary && (
          <div className="mt-3 pt-3 border-t border-dashed">
            <h4 className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" /> AI Summary
            </h4>
            <p className="line-clamp-3 text-xs text-muted-foreground italic">
              {note.summary}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-3">
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {note.tags.slice(0, 5).map(tag => ( // Show max 5 tags
              <Badge key={tag} variant="secondary" className="text-xs py-0.5 px-1.5 rounded-sm shadow-sm">{tag}</Badge>
            ))}
            {note.tags.length > 5 && <Badge variant="outline" className="text-xs">+{note.tags.length - 5} more</Badge>}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
