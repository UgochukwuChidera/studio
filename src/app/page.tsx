"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { NoteCard } from "@/components/NoteCard";
import { NoteForm } from "@/components/NoteForm";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { SummaryModal } from "@/components/SummaryModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNoteStore } from "@/store/noteStore";
import type { Note } from "@/types";
import { Search, ListFilter, LayoutGrid, LayoutList, Loader2, FileWarning } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SortOption = "newest" | "oldest" | "titleAsc" | "titleDesc";
type LayoutOption = "grid" | "list";

export default function HomePage() {
  const {
    notes,
    searchTerm,
    setSearchTerm,
    confirmationModal,
    closeConfirmationModal,
    deleteNote: deleteNoteFromStore,
    _hasHydrated,
  } = useNoteStore();

  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [layoutOption, setLayoutOption] = useState<LayoutOption>("grid");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const filteredAndSortedNotes = useMemo(() => {
    let filtered = notes.filter(
      (note) =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    switch (sortOption) {
      case "newest":
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        break;
      case "titleAsc":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "titleDesc":
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }
    return filtered;
  }, [notes, searchTerm, sortOption]);

  const handleConfirmDelete = () => {
    if (confirmationModal.noteIdToDelete && confirmationModal.onConfirm) {
      confirmationModal.onConfirm(); // This can be used for custom logic before store delete
      deleteNoteFromStore(confirmationModal.noteIdToDelete);
    }
    closeConfirmationModal();
  };
  
  if (!mounted || !_hasHydrated) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading your notes...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 md:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search notes by title, content, or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-base shadow-sm rounded-full focus:shadow-md transition-shadow"
            />
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto justify-between sm:justify-end">
            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger className="w-auto sm:w-[180px] shadow-sm rounded-full focus:shadow-md transition-shadow">
                <ListFilter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-md shadow-lg">
                <SelectItem value="newest">Sort: Newest</SelectItem>
                <SelectItem value="oldest">Sort: Oldest</SelectItem>
                <SelectItem value="titleAsc">Sort: Title (A-Z)</SelectItem>
                <SelectItem value="titleDesc">Sort: Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-full p-0.5 bg-muted shadow-sm">
                <Button variant={layoutOption === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setLayoutOption('grid')} className={`rounded-full h-9 w-9 ${layoutOption === 'grid' ? 'shadow-md' : ''}`}>
                    <LayoutGrid className="h-5 w-5"/>
                </Button>
                 <Button variant={layoutOption === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setLayoutOption('list')} className={`rounded-full h-9 w-9 ${layoutOption === 'list' ? 'shadow-md' : ''}`}>
                    <LayoutList className="h-5 w-5"/>
                </Button>
            </div>
          </div>
        </div>

        {filteredAndSortedNotes.length > 0 ? (
          <ScrollArea className={layoutOption === "grid" ? "" : "h-[calc(100vh-280px)]"}> {/* Adjust height for list view */}
            <div
              className={
                layoutOption === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {filteredAndSortedNotes.map((note: Note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-20">
            <FileWarning className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground/80 mb-2">
              {searchTerm ? "No notes found matching your search." : "No notes yet!"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try a different search term or " : "Click 'Create Note' to get started."}
              {!searchTerm && <Button variant="link" className="p-0 h-auto" onClick={() => useNoteStore.getState().openFormModal()}>create your first note</Button>}
              {searchTerm && <Button variant="link" className="p-0 h-auto" onClick={() => setSearchTerm('')}>clear search</Button>}
              .
            </p>
          </div>
        )}
      </main>

      <NoteForm />
      <SummaryModal />
      <ConfirmationDialog
        isOpen={confirmationModal.isOpen}
        onOpenChange={(open) => !open && closeConfirmationModal()}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
      />
    </div>
  );
}
