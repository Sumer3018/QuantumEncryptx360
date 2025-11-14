/* frontend/src/config.js
   Normalize VITE_API_URL at build time and ensure it is the backend ROOT (no /api/v1)
*/
const raw = import.meta.env.VITE_API_URL || "http://localhost:8000";

// remove trailing slashes
let normalized = raw.replace(/\/+$/, "");

// if someone accidentally set the env with /api/v1, remove that too
normalized = normalized.replace(/\/api\/v1$/i, "");

// export
export const API_URL = normalized;