/* ================================================================
   js/config.js — Central API configuration
   IOB-H003 fix: ngrok URL in ONE place, not hardcoded in 12+ files
   
   HOW TO USE:
   Add to every HTML page BEFORE any other scripts:
     <script src="/js/config.js"></script>
   
   Then in your page scripts, use:
     const API_BASE = window.APP_CONFIG.API_BASE;
   
   To change the backend URL, edit ONLY this file.
================================================================ */

(function () {
    "use strict";

    // ── Detect environment ──────────────────────────────────
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";

    // ── Set API base based on environment ───────────────────
    // In production (Vercel), set this via Vercel Environment Variables:
    //   VITE_API_BASE = https://your-backend-url.ngrok-free.dev
    // For now: one place to change the ngrok URL
    const NGROK_URL = "https://manatee-dislike-lifting.ngrok-free.dev";

    const API_BASE = isLocal
        ? "http://localhost:5332"
        : NGROK_URL;

    // ── Expose globally ─────────────────────────────────────
    window.APP_CONFIG = Object.freeze({
        API_BASE:     API_BASE,
        NGROK_URL:    NGROK_URL,
        IS_LOCAL:     isLocal,
        VERSION:      "2.3",
    });

    // Also set top-level API_BASE for backward compatibility
    // (existing pages use `const API_BASE = "..."` — this won't override
    //  those but new pages should use window.APP_CONFIG.API_BASE)
    if (typeof window.API_BASE === "undefined") {
        window.API_BASE = API_BASE;
    }
    if (typeof window.BASE_URL === "undefined") {
        window.BASE_URL = API_BASE;
    }
})();
