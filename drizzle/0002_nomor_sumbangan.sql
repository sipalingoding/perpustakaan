-- Nomor urut kode tanda terima sumbangan (SB-MMDD-NNNN). Sequence dipakai agar dua sumbangan
-- yang masuk bersamaan tidak pernah mendapat kode yang sama.
CREATE SEQUENCE "donation_code_seq" AS integer START 1 INCREMENT 1;
