-- Default billing currency for India-based BuildView operations.
ALTER TABLE public.platform_settings
  ALTER COLUMN default_currency SET DEFAULT 'INR';

UPDATE public.platform_settings
SET default_currency = 'INR'
WHERE id = 'default' AND default_currency = 'USD';

ALTER TABLE public.invoices
  ALTER COLUMN currency SET DEFAULT 'INR';
