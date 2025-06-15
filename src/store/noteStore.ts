"use client";

import type { Note } from '@/types';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface NoteState {
  notes: Note[];
  searchTerm: string;
  isLoadingSummary: boolean;
  isFormModalOpen: boolean;
  editingNote: Note | null;
  summaryModalContent: { noteId: string; title: string; summary: string } | null;
  confirmationModal: { 
    isOpen: boolean; 
    noteIdToDelete: string | null; 
    onConfirm: (() => void) | null;
  };

  addNote: (noteData: Pick<Note, 'title' | 'content' | 'tags'>) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  setSearchTerm: (term: string) => void;
  getNoteById: (id: string) => Note | undefined;
  setNoteSummary: (id: string, summary: string) => void;
  setIsLoadingSummary: (isLoading: boolean) => void;
  
  openFormModal: (note?: Note) => void;
  closeFormModal: () => void;
  openSummaryModal: (noteId: string, title: string, summary: string) => void;
  closeSummaryModal: () => void;
  openConfirmationModal: (noteId: string, onConfirmAction: () => void) => void;
  closeConfirmationModal: () => void;

  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => ({
      notes: [],
      searchTerm: '',
      isLoadingSummary: false,
      isFormModalOpen: false,
      editingNote: null,
      summaryModalContent: null,
      confirmationModal: { isOpen: false, noteIdToDelete: null, onConfirm: null },
      _hasHydrated: false,

      setHasHydrated: (hydrated) => {
        set({
          _hasHydrated: hydrated,
        });
      },

      addNote: (noteData) => {
        const newNote: Note = {
          ...noteData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ notes: [newNote, ...state.notes] }));
      },
      updateNote: (updatedNote) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === updatedNote.id ? { ...updatedNote, updatedAt: new Date().toISOString() } : n
          ),
        })),
      deleteNote: (id) =>
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),
      setSearchTerm: (term) => set({ searchTerm: term }),
      getNoteById: (id) => get().notes.find((n) => n.id === id),
      setNoteSummary: (id, summary) => {
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, summary } : n)),
        }));
      },
      setIsLoadingSummary: (isLoading) => set({ isLoadingSummary: isLoading }),
      
      openFormModal: (note) => set({ isFormModalOpen: true, editingNote: note || null }),
      closeFormModal: () => set({ isFormModalOpen: false, editingNote: null }),
      
      openSummaryModal: (noteId, title, summary) => set({ summaryModalContent: { noteId, title, summary } }),
      closeSummaryModal: () => set({ summaryModalContent: null }),

      openConfirmationModal: (noteId, onConfirmAction) => set({ confirmationModal: { isOpen: true, noteIdToDelete: noteId, onConfirm: onConfirmAction } }),
      closeConfirmationModal: () => set({ confirmationModal: { isOpen: false, noteIdToDelete: null, onConfirm: null } }),
    }),
    {
      name: 'noteflow-storage', 
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    }
  )
);
