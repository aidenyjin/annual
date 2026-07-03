-- Cache the PDF's extracted text on the row so the server never has to
-- re-run (CPU-heavy) PDF parsing. Extraction now happens in the browser at
-- upload time; this stores the result for reuse by plan regeneration.
alter table public.syllabi
  add column if not exists extracted_text text;
