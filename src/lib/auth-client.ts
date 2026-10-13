"use client";

import { createAuthClient } from "@neondatabase/auth/next";

// Bicara dengan /api/auth di situs ini, yang diteruskan ke Neon Auth.
export const authClient = createAuthClient();
