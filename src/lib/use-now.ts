"use client";

import { useEffect, useState } from "react";

/** Waktu sekarang (ms) yang diperbarui tiap menit. Mulai dari `initial` dari server supaya hidrasi cocok. */
export function useNow(initial: number) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
