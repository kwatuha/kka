-- Fix mojibake in service point names seeded by migration 82.
-- Intended separator was an em dash (—); when the migration ran without utf8mb4 client
-- charset, UTF-8 bytes were stored as the literal characters â, €, and " (U+201D).
-- Example: "Elburgon â€" Billing" should read "Elburgon - Billing".

SET @bad_sep = CONVERT(UNHEX('C3A2E282ACE2809D') USING utf8mb4) COLLATE utf8mb4_unicode_ci;

UPDATE service_points
SET pointName = REPLACE(pointName, CONCAT(' ', @bad_sep, ' '), ' - ')
WHERE pointName LIKE CONCAT('%', @bad_sep, '%') COLLATE utf8mb4_unicode_ci;
