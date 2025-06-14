
import SharedNotesClient from './shared-notes-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'View Shared Notes - TestPrep AI', // Updated title
  description: 'View notes shared by another TestPrep AI user.', // Updated description
};

// This page will be dynamically routed based on the [id]
// The actual note data will be passed via URL query param 'data'
export default function SharedNotesPage({ params }: { params: { id: string } }) {
  return <SharedNotesClient noteId={params.id} />;
}

    