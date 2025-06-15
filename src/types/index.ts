export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO string date
  updatedAt: string; // ISO string date
  summary?: string; // Optional AI-generated summary
}
