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
  const url = `${API_BASE_URL}/api/ai-search`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, courseId: courseId || null }),
  });

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { response: text };
  }

  if (!response.ok) {
    console.error("AI search failed", url, response.status, data);
    throw new Error(data?.message || data?.error || text || "Search failed");
  }

  return data as SearchResult;
}
