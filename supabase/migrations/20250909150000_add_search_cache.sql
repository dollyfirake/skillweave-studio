-- Create search cache table
CREATE TABLE IF NOT EXISTS public.search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  results JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(query)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_search_cache_query ON public.search_cache(query);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON public.search_cache(expires_at);

-- Add RLS policies if needed
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access to cache (adjust permissions as needed)
CREATE POLICY "Allow public read access to search cache"
  ON public.search_cache FOR SELECT
  USING (true);

-- Restrict insert/update/delete to authenticated users or service role
CREATE POLICY "Allow insert for authenticated users"
  ON public.search_cache FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_cache_updated_at
BEFORE UPDATE ON public.search_cache
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
