// Web (Vite) — import.meta.env is available at build time
export const ENV_GAS_SHARED_TOKEN: string = import.meta.env.VITE_GAS_SHARED_TOKEN ?? "";
export const ENV_GEMINI_API_KEY: string = import.meta.env.VITE_GEMINI_API_KEY ?? "";
