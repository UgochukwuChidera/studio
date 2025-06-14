
import TestDisplayClient from './test-display-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'View Shared Test - TestPrep AI',
  description: 'View a test shared by another TestPrep AI user.',
};

// This page will be dynamically routed based on the [id]
// For MVP, the actual test data will be passed via URL query param 'data'
// The [id] part of the path is for user-friendly URLs but won't be used to fetch from DB in MVP
export default function SharedTestPage({ params }: { params: { id: string } }) {
  return <TestDisplayClient testId={params.id} />;
}
