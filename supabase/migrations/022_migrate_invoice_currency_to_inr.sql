-- Migrate legacy invoice rows still stored as USD to INR.
UPDATE public.invoices
SET currency = 'INR'
WHERE currency IS NULL OR currency = '' OR currency = 'USD';
