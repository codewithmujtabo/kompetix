-- Add csv_template_url to competitions so organizers can upload a sample CSV
-- showing teachers what columns/format their bulk-registration file should have.

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS csv_template_url TEXT;
