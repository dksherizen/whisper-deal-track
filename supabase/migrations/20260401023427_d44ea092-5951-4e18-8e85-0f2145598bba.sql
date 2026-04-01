ALTER TABLE public.deals DROP CONSTRAINT deals_currency_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_currency_check CHECK (currency IN ('GBP', 'USD', 'EUR'));