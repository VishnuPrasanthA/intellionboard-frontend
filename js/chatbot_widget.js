
/* ================================================================
   chatbot_widget.js  —  Universal drop-in for ALL dashboard pages
   
   PASTE THIS entire block into each dashboard HTML <script> section.
   Replace whatever askAgent / sendAgent / sendMessage / processCmd
   / runCmd / sendBotMsg / botCmd was there before.

   Works for:
     ✅ pmo_dashboard_pro.html      (sendAgent → calls API)
     ✅ leadership_dashboard.html   (sendMessage → calls API)
     ✅ healthcare_pmo_dashboard.html (askAgent → calls API)
     ✅ admin_dashboard.html        (sendBotMsg → calls API)
     ✅ Any future page             (just paste and set PAGE_ROLE)
================================================================ */

/* ── SET THIS per page ──────────────────────────────────────────
   PAGE_ROLE is sent to backend so logs are tagged per page type.
   Values: "HC_PMO" | "ACCOUNT_PMO" | "LEADERSHIP" | "ADMIN" | "ITSG"
   Change to match the page you're pasting into.
   ────────────────────────────────────────────────────────────── */
const PAGE_ROLE = "HC_PMO";  // ← change per page

/* ── Detect API base — works across all pages ────────────────── */
const _CHAT_API = (typeof BASE_URL !== "undefined" ? BASE_URL :
                   typeof API_BASE !== "undefined" ? API_BASE :
                   "https://manatee-dislike-lifting.ngrok-free.dev")
                  + "/api/chatbot";

const _userEmail = () =>
    localStorage.getItem("user_email") ||
    localStorage.getItem("email")      ||
    (typeof rm_email !== "undefined" ? rm_email : "") || "";

/* ── Universal chat send — all pages call this ──────────────── */
async function _chatSend(inputId, addFn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const msg = (inp.value || "").trim();
    if (!msg) return;
    addFn("YOU", msg);
    inp.value = "";

    // Typing indicator
    const tid = "typing_" + Date.now();
    addFn("AI", `<span id="${tid}">🤖 Thinking...</span>`);

    try {
        const opts = { method: "POST",
            headers: {"Content-Type":"application/json",
                      "ngrok-skip-browser-warning":"true"},
            credentials: "include",
            body: JSON.stringify({
                message:    msg,
                user_email: _userEmail(),
                user_role:  PAGE_ROLE,
                page:       PAGE_ROLE
            })
        };
        const res  = await fetch(_CHAT_API, opts);
        const data = await res.json();

        const tel = document.getElementById(tid);
        if (tel) tel.closest("[class*='chat-message'],[class*='msg']")?.remove();

        if (!data.success) {
            addFn("AI", "❌ " + (data.message || "Server error"));
            return;
        }

        // If typo was corrected, show it subtly
        if (data.corrected) {
            addFn("AI", `<small style="color:#94a3b8;font-size:10px;">
                💬 Interpreted as: "<i>${data.corrected}</i>"</small>`);
        }

        addFn("AI", _fmtReply(data.reply));

    } catch(e) {
        const tel = document.getElementById(tid);
        if (tel) tel.closest("[class*='chat-message'],[class*='msg']")?.remove();
        console.error("Chat error:", e);
        addFn("AI", "❌ Cannot reach AI backend. Check connection.");
    }
}

/* ── FORMAT REPLY ───────────────────────────────────────────── */
function _fmtReply(r) {
    if (!r) return "⚠️ No response.";
    const t = r.type;

    if (t === "summary") {
        const d = r.data || {};
        const rows = Object.entries(d).map(([k,v]) =>
            `<tr><td style="color:#7d8da5;padding:4px 8px;font-size:11px;">${
                k.replace(/_/g," ")}</td>
             <td style="font-weight:800;padding:4px 8px;font-size:13px;">${v}</td></tr>`
        ).join("");
        return `<b>${r.title}</b><br>
            <table style="margin-top:6px;border-collapse:collapse">${rows}</table>`;
    }

    if (t === "list") {
        if (!(r.items||[]).length) return `${r.title||""} — No records found.`;
        const rows = (r.items||[]).slice(0,8).map(row => {
            const name = row.emp_name || row.location || row.account_name || "—";
            const sub  = row.current_step
                ? row.current_step.replace(/_/g," ")
                : row.count ? `${row.count} employees` : "";
            const loc  = row.location ? ` · ${row.location}` : "";
            return `• <b>${name}</b>${loc}${sub ? " — "+sub : ""}`;
        }).join("<br>");
        const more = (r.total||0) > 8
            ? `<br><span style="color:#94a3b8;font-size:10px;">…and ${r.total-8} more</span>` : "";
        return `<b>${r.title}</b><br>━━━━━━━━━━━━━━<br>${rows}${more}`;
    }

    if (t === "employee") {
        const d = r.data || {};
        const fields = [
            ["ID",       d.emp_id],
            ["Role",     d.designation],
            ["Location", d.location],
            ["Status",   d.onboarding_status],
            ["Step",     (d.current_step||"").replace(/_/g," ")],
            ["Progress", (d.progress||0)+"%"],
            ["Training", (d.training_percentage||0)+"%"],
            ["Laptop",   d.laptop_status||"—"],
            ["ID Card",  d.id_card_status||"—"],
            ["Risk",     d.risk_level||"LOW"],
        ].filter(([,v])=>v).map(([k,v])=>
            `<tr><td style="color:#7d8da5;padding:3px 8px;font-size:11px;
              white-space:nowrap">${k}</td>
             <td style="font-weight:700;padding:3px 8px;font-size:12px;">${v}</td></tr>`
        ).join("");
        return `<b>👤 ${d.emp_name||"—"}</b><br>
            <table style="margin-top:6px;border-collapse:collapse">${fields}</table>`;
    }

    if (t === "help") {
        const items = (r.intents||[]).map(c => {
            const cmd = c.split("/")[0].trim();
            return `<div onclick="
                    const inp=document.getElementById('chatInput')||
                               document.getElementById('agentInput');
                    if(inp){inp.value='${cmd}';
                    (typeof askAgent!=='undefined'?askAgent:
                     typeof sendAgent!=='undefined'?sendAgent:
                     typeof sendMessage!=='undefined'?sendMessage:
                     typeof sendBotMsg!=='undefined'?sendBotMsg:()=>{})();}
                " style="padding:7px 10px;margin:3px 0;border-radius:8px;
                    border:1px solid #e8f0f8;cursor:pointer;font-size:12px;
                    background:#f8fbff;transition:all .15s"
                onmouseover="this.style.background='#e8f5f0'"
                onmouseout="this.style.background='#f8fbff'">
                ${c} <span style="color:#19d3a2;font-size:10px;font-weight:800">▶ click</span>
            </div>`;
        }).join("");
        return `<b>${r.title}</b><br>
            <small style="color:#7d8da5">I learn new commands automatically from every use.</small>
            <div style="margin-top:8px">${items}</div>`;
    }

    if (t === "confirm") {
        return `<b>${r.title}</b><br>${r.message}<br>
            <button onclick="${r.action}()" style="margin-top:8px;
                background:linear-gradient(135deg,#19d3a2,#0f9e75);
                color:white;border:none;border-radius:10px;
                padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;">
                ✅ Confirm
            </button>`;
    }

    if (t === "action") {
        return `<b>${r.title}</b><br>${r.message}<br>
            <button onclick="${r.action}()" style="margin-top:8px;
                background:linear-gradient(135deg,#3ea6ff,#73c7ff);
                color:white;border:none;border-radius:10px;
                padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;">
                ▶ Open
            </button>`;
    }

    if (t === "count") {
        return `<b>${r.title}</b><br>
            <span style="font-size:26px;font-weight:900">${r.count}</span><br>
            <small style="color:#7d8da5">${r.message||""}</small>`;
    }

    if (t === "fallback") {
        return `🤖 ${r.message}<br>
            <small style="color:#94a3b8;font-size:10px;">
                ✍️ "<i>${r.raw_input||""}</i>" logged — model learns it automatically.
            </small>`;
    }

    if (t === "prompt" || t === "not_found") return `⚠️ ${r.message}`;
    return r.message || JSON.stringify(r);
}

/* ================================================================
   PAGE-SPECIFIC WRAPPERS
   Each page's existing send function now just calls _chatSend.
   The function NAMES stay the same — no other code breaks.
================================================================ */

/* ── HC PMO / Account PMO ── askAgent() + addChat() ─────────── */
function askAgent() {
    const addFn = (typeof addChat !== "undefined")   ? addChat :
                  (typeof addBotMsg !== "undefined") ?
                      (role, html) => addBotMsg(html) :
                      (role, html) => console.log(role, html);
    _chatSend("chatInput", addFn) ||
    _chatSend("agentInput", addFn);
}

/* ── Account PMO ── sendAgent() ─────────────────────────────── */
function sendAgent() { askAgent(); }

/* ── Account PMO ── processCmd() (called by sendAgent) ──────── */
function processCmd(msg, raw) { askAgent(); }

/* ── Leadership ── sendMessage() ────────────────────────────── */
function sendMessage() {
    const addFn = (typeof addChat !== "undefined") ? addChat :
        (role, html) => {
            const b = document.getElementById("chatBody");
            if (!b) return;
            const d = document.createElement("div");
            d.className = "chat-message " + (role==="YOU"?"you":"ai");
            d.innerHTML = `<b>${role==="YOU"?"You":"AI"}</b><div>${html}</div>`;
            b.appendChild(d); b.scrollTop = b.scrollHeight;
        };
    _chatSend("chatInput", addFn);
}

/* ── Admin ── sendBotMsg() ───────────────────────────────────── */
function sendBotMsg() {
    const addFn = (typeof addChat !== "undefined") ? addChat :
        (role, html) => {
            const b = document.getElementById("chatBody");
            if (!b) return;
            const d = document.createElement("div");
            d.className = "chat-message " + (role==="YOU"?"you":"ai");
            d.innerHTML = `<b>${role==="YOU"?"You":"AI"}</b><div>${html}</div>`;
            b.appendChild(d); b.scrollTop = b.scrollHeight;
        };
    _chatSend("chatInput", addFn);
}

/* ── Admin ── botCmd() alias ────────────────────────────────── */
function botCmd(cmd) {
    const inp = document.getElementById("chatInput");
    if (inp) { inp.value = cmd; sendBotMsg(); }
}

/* ── Leadership ── runCmd() alias ───────────────────────────── */
function runCmd(cmd) {
    const inp = document.getElementById("chatInput");
    if (inp) { inp.value = cmd; sendMessage(); }
}

/* ── agentCmd() (Account PMO) ───────────────────────────────── */
function agentCmd(cmd) {
    const inp = document.getElementById("agentInput") ||
                document.getElementById("chatInput");
    if (inp) { inp.value = cmd; askAgent(); }
}

/* ── quickAction() (HC PMO quick buttons) ───────────────────── */
function quickAction(cmd) { agentCmd(cmd); }

/* ── Bind Enter key for all input IDs ──────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    ["chatInput","agentInput","user_input"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                // Call whichever send function exists on this page
                (typeof askAgent     !== "undefined" ? askAgent     :
                 typeof sendMessage  !== "undefined" ? sendMessage  :
                 typeof sendBotMsg   !== "undefined" ? sendBotMsg   :
                 typeof sendAgent    !== "undefined" ? sendAgent     : ()=>{})();
            }
        });
    });
});
