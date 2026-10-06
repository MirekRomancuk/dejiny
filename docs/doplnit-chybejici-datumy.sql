-- Doplnění datumů, která má ostrý web (Joomla) a u nás chybí. Ověřeno 2026-07-13.
-- Spustit jako admin v Supabase SQL editoru. Záloha dat doporučena.
BEGIN;
UPDATE public.events SET date_text='VIII.', month=8 WHERE id=2371;
UPDATE public.events SET date_text='30.1.', month=1 WHERE id=2375;
UPDATE public.events SET date_text='3.1.', month=1 WHERE id=2502;
UPDATE public.events SET date_text='14.1.', month=1 WHERE id=2520;
UPDATE public.events SET date_text='22.8.', month=8 WHERE id=2594;
UPDATE public.events SET date_text='X.', month=10 WHERE id=2718;
UPDATE public.events SET date_text='VII.', month=7 WHERE id=2742;
UPDATE public.events SET date_text='16.8.', month=8 WHERE id=2756;
UPDATE public.events SET date_text='17.2.', month=2 WHERE id=2829;
UPDATE public.events SET date_text='IV.', month=4 WHERE id=2838;
UPDATE public.events SET date_text='7.6.', month=6 WHERE id=2841;
UPDATE public.events SET date_text='25.6.', month=6 WHERE id=2880;
UPDATE public.events SET date_text='II.', month=2 WHERE id=2894;
UPDATE public.events SET date_text='9.8.', month=8 WHERE id=2937;
UPDATE public.events SET date_text='23.1.', month=1 WHERE id=2981;
UPDATE public.events SET date_text='I.', month=1 WHERE id=3038;
UPDATE public.events SET date_text='XII.', month=12 WHERE id=3052;
UPDATE public.events SET date_text='V.', month=5 WHERE id=3066;
UPDATE public.events SET date_text='1.11.', month=11 WHERE id=3071;
UPDATE public.events SET date_text='IV.', month=4 WHERE id=3118;
UPDATE public.events SET date_text='VI.', month=6 WHERE id=3276;
UPDATE public.events SET date_text='VII.', month=7 WHERE id=3307;
UPDATE public.events SET date_text='5.8.', month=8 WHERE id=3411;
UPDATE public.events SET date_text='XII.', month=12 WHERE id=3421;
COMMIT;
