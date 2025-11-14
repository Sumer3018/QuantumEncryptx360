// frontend/src/api.js
// frontend/src/api.js — add for debugging (remove after)
console.log("VITE_API_URL (build-time):", import.meta.env.VITE_API_URL);


import { API_URL } from "./config.js";

/* Helper for POST FormData expecting JSON response */
async function postFormJson(path, form) {
  const fullUrl = `${API_URL}${path}`;
  console.log("DEBUG: Fetching URL ->", fullUrl);     // <<--- debug line
  const res = await fetch(fullUrl, { method: "POST", body: form });
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw { status: res.status, body: json, text };
    return json;
  } catch (err) {
    if (!res.ok) throw { status: res.status, text };
    return text;
  }
}


/* 1) session initiation */
export async function initiateSession({ user_id, peer_id, simulate_eavesdropper = false }) {
  const form = new FormData();
  form.append("user_id", user_id);
  form.append("peer_id", peer_id);
  form.append("simulate_eavesdropper", simulate_eavesdropper ? "true" : "false");
  return postFormJson("/api/v1/session/initiate", form);
}

/* 2) encrypt file */
export async function encryptFile({ user_id, peer_id, file }) {
  const form = new FormData();
  form.append("user_id", user_id);
  form.append("peer_id", peer_id);
  form.append("file", file, file.name);
  return postFormJson("/api/v1/encrypt-file", form);
}

/* 3) decrypt preview */
export async function decryptFilePreview({ user_id, peer_id, nonce, tag, ciphertext }) {
  const form = new FormData();
  form.append("user_id", user_id);
  form.append("peer_id", peer_id);
  form.append("nonce", nonce);
  form.append("tag", tag);
  form.append("ciphertext", ciphertext);
  return postFormJson("/api/v1/decrypt-file-preview", form);
}

/* 4) decrypt download -> returns Response for blob handling */
export async function decryptFileDownload({ user_id, peer_id, nonce, tag, ciphertext }) {
  const form = new FormData();
  form.append("user_id", user_id);
  form.append("peer_id", peer_id);
  form.append("nonce", nonce);
  form.append("tag", tag);
  form.append("ciphertext", ciphertext);

  const res = await fetch(`${API_URL}/api/v1/decrypt-file`, { method: "POST", body: form });
  if (!res.ok) {
    const txt = await res.text().catch(()=>null);
    throw { status: res.status, message: txt || "Download failed" };
  }
  return res;
}
