import { auth } from "@/lib/server/auth";

// Meneruskan permintaan klien auth ke Neon Auth.
export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
