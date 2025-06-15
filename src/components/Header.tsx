"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle, StickyNote } from "lucide-react";
import { useNoteStore } from "@/store/noteStore";

export function Header() {
  const openFormModal = useNoteStore((state) => state.openFormModal);

  return (
    <header className="py-6 px-4 md:px-8 border-b bg-card shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <StickyNote className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold font-headline text-primary">NoteFlow</h1>
        </div>
        <Button onClick={() => openFormModal()} variant="default" className="rounded-full shadow-md hover:shadow-lg transition-shadow">
          <PlusCircle className="mr-2 h-5 w-5" />
          Create Note
        </Button>
      </div>
    </header>
  );
}
