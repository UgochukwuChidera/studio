"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import { useNoteStore } from "@/store/noteStore";
import type { Note } from "@/types";
import { useEffect } from "react";
import { Save, XCircle } from "lucide-react";

const noteFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  content: z.string().min(1, "Content is required"),
  tags: z.array(z.string()).max(10, "You can add up to 10 tags"),
});

type NoteFormData = z.infer<typeof noteFormSchema>;

export function NoteForm() {
  const { isFormModalOpen, closeFormModal, editingNote, addNote, updateNote } = useNoteStore();

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: "",
      content: "",
      tags: [],
    },
  });

  useEffect(() => {
    if (editingNote) {
      form.reset({
        title: editingNote.title,
        content: editingNote.content,
        tags: editingNote.tags,
      });
    } else {
      form.reset({
        title: "",
        content: "",
        tags: [],
      });
    }
  }, [editingNote, form, isFormModalOpen]);

  const onSubmit = (data: NoteFormData) => {
    if (editingNote) {
      updateNote({ ...editingNote, ...data });
    } else {
      addNote(data);
    }
    closeFormModal();
  };

  return (
    <Dialog open={isFormModalOpen} onOpenChange={(isOpen) => !isOpen && closeFormModal()}>
      <DialogContent className="sm:max-w-[600px] shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">
            {editingNote ? "Edit Note" : "Create New Note"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter note title" {...field} className="text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Start writing your note..."
                      {...field}
                      rows={8}
                      className="text-base resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Tags</FormLabel>
                  <FormControl>
                    <TagInput {...field} placeholder="Add tags (e.g., work, personal)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" variant="default">
                <Save className="mr-2 h-4 w-4" />
                {editingNote ? "Save Changes" : "Create Note"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
