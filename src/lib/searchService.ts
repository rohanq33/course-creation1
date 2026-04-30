import { API_BASE_URL } from "@/lib/api";

export interface SearchSource {
  lesson_id: string;
  course_id: string;
  title: string;
  course: string;
  score: number;
}

export interface SearchResult {
  answer: string;
  sources: SearchSource[];
  related_lessons: { id: string; title: string; course_id: string }[];
  suggested_queries: string[];
}

export async function aiSearch(query: string, courseId?: string): Promise<SearchResult> {
  const response = await fetch(`${API_BASE_URL}/api/ai-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, courseId: courseId || null }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Search failed");
  }

  return data as SearchResult;
}
