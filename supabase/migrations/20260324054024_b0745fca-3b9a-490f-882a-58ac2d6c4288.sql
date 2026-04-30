
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create document_chunks table for RAG
CREATE TABLE public.document_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    chunk_index integer NOT NULL DEFAULT 0,
    chunk_text text NOT NULL,
    embedding vector(768),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT document_chunks_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE,
    CONSTRAINT document_chunks_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
);

-- Create index for vector similarity search
CREATE INDEX document_chunks_embedding_idx ON public.document_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for filtering by course
CREATE INDEX document_chunks_course_id_idx ON public.document_chunks(course_id);
CREATE INDEX document_chunks_lesson_id_idx ON public.document_chunks(lesson_id);

-- Full-text search index as fallback
ALTER TABLE public.document_chunks ADD COLUMN fts tsvector
    GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED;
CREATE INDEX document_chunks_fts_idx ON public.document_chunks USING gin(fts);

-- Enable RLS
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Public read access for demo mode
CREATE POLICY "Anyone can view document chunks" ON public.document_chunks
    FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert document chunks" ON public.document_chunks
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can update document chunks" ON public.document_chunks
    FOR UPDATE TO public USING (true);

CREATE POLICY "Anyone can delete document chunks" ON public.document_chunks
    FOR DELETE TO public USING (true);

-- Function to match chunks by vector similarity
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding vector(768),
    filter_course_id uuid DEFAULT NULL,
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    course_id uuid,
    lesson_id uuid,
    chunk_text text,
    metadata jsonb,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        dc.id,
        dc.course_id,
        dc.lesson_id,
        dc.chunk_text,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE
        dc.embedding IS NOT NULL
        AND (filter_course_id IS NULL OR dc.course_id = filter_course_id)
        AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Function for full-text search fallback
CREATE OR REPLACE FUNCTION public.search_document_chunks(
    query_text text,
    filter_course_id uuid DEFAULT NULL,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    course_id uuid,
    lesson_id uuid,
    chunk_text text,
    metadata jsonb,
    rank float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        dc.id,
        dc.course_id,
        dc.lesson_id,
        dc.chunk_text,
        dc.metadata,
        ts_rank(dc.fts, websearch_to_tsquery('english', query_text))::float AS rank
    FROM public.document_chunks dc
    WHERE
        dc.fts @@ websearch_to_tsquery('english', query_text)
        AND (filter_course_id IS NULL OR dc.course_id = filter_course_id)
    ORDER BY rank DESC
    LIMIT match_count;
$$;
