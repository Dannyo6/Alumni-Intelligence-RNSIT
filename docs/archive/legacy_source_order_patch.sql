-- ==============================================================================
-- ARCHIVED PROTOTYPE SQL - DO NOT RUN AGAINST PRODUCTION
-- ==============================================================================
-- This file contains legacy prototype source order patch SQL and is preserved for
-- reference only.
-- ==============================================================================

-- Update Alumni table to store original Excel source sheet and row index
-- This guarantees we can preserve the exact original ordering of the records

ALTER TABLE public.alumni 
ADD COLUMN IF NOT EXISTS source_sheet TEXT,
ADD COLUMN IF NOT EXISTS source_row INTEGER;

-- Create an index to make ordering by original sheet/row fast
CREATE INDEX IF NOT EXISTS idx_alumni_source ON public.alumni(source_sheet, source_row);
