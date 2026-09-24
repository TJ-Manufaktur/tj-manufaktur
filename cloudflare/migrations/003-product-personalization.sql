-- Produktpersonalisierung optional schaltbar
ALTER TABLE products ADD COLUMN personalizable INTEGER NOT NULL DEFAULT 1 CHECK(personalizable IN (0,1));
