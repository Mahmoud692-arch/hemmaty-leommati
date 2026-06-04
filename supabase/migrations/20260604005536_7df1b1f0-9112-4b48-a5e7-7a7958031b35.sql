ALTER TABLE public.hadiths ADD COLUMN IF NOT EXISTS collection text NOT NULL DEFAULT 'nawawi';
ALTER TABLE public.hadiths DROP CONSTRAINT IF EXISTS hadiths_number_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hadiths_collection_number_key') THEN
    ALTER TABLE public.hadiths ADD CONSTRAINT hadiths_collection_number_key UNIQUE (collection, number);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_hadiths_collection ON public.hadiths(collection);

ALTER TABLE public.hadith_reads ADD COLUMN IF NOT EXISTS hadith_collection text NOT NULL DEFAULT 'nawawi';
ALTER TABLE public.hadith_reads DROP CONSTRAINT IF EXISTS hadith_reads_user_id_hadith_number_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hadith_reads_unique') THEN
    ALTER TABLE public.hadith_reads ADD CONSTRAINT hadith_reads_unique UNIQUE (user_id, hadith_collection, hadith_number);
  END IF;
END $$;

ALTER TABLE public.hadith_favorites ADD COLUMN IF NOT EXISTS hadith_collection text NOT NULL DEFAULT 'nawawi';
ALTER TABLE public.hadith_favorites DROP CONSTRAINT IF EXISTS hadith_favorites_user_id_hadith_number_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hadith_favorites_unique') THEN
    ALTER TABLE public.hadith_favorites ADD CONSTRAINT hadith_favorites_unique UNIQUE (user_id, hadith_collection, hadith_number);
  END IF;
END $$;