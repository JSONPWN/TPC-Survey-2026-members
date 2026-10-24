// Members edition: data/responses.enc.json is AES-GCM encrypted with a key derived
// from the members' password (PBKDF2-SHA256), so the site can live on a public host.
// Pages stay hidden (body.members-locked) until unlock() succeeds.
// Build the encrypted file with tools/encrypt-responses.mjs.
const MembersGate = (() => {

const DATA_URL = "./data/responses.enc.json";
const KEY_STORE = "tpcMembersKey";
const SCOPE_STORE = "tpcScope";
const MEMBER_Q = "Are you a member or non-member of TPC?\n\n(Member here defined as current possession of the \"member\" role in the server.)";

const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const toB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));

// Storage can throw (private mode, blocked site data), so every access is guarded.
function storageGet(store, name) {
    try { return store.getItem(name); } catch { return null; }
}
function storageSet(store, name, value) {
    try { store.setItem(name, value); } catch { /* not persisted; fine */ }
}
function storageRemove(store, name) {
    try { store.removeItem(name); } catch { /* nothing to remove */ }
}

async function deriveKey(password, payload) {
    const base = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", hash: "SHA-256", salt: fromB64(payload.salt), iterations: payload.iterations },
        base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
}

async function decrypt(key, payload) {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(payload.iv) }, key, fromB64(payload.data));
    return JSON.parse(new TextDecoder().decode(plain));
}

// The derived key (never the password) is cached with the file's salt, so
// re-encrypting with a new password invalidates old saved keys automatically.
async function saveKey(key, payload, remember) {
    const raw = toB64(await crypto.subtle.exportKey("raw", key));
    const value = JSON.stringify({ salt: payload.salt, key: raw });
    storageSet(sessionStorage, KEY_STORE, value);
    if (remember) storageSet(localStorage, KEY_STORE, value);
}

async function loadSavedKey(payload) {
    const value = storageGet(sessionStorage, KEY_STORE) || storageGet(localStorage, KEY_STORE);
    if (!value) return null;
    try {
        const saved = JSON.parse(value);
        if (saved.salt !== payload.salt) return null;
        return await crypto.subtle.importKey("raw", fromB64(saved.key), "AES-GCM", true, ["decrypt"]);
    } catch {
        return null;
    }
}

function forgetKey() {
    storageRemove(sessionStorage, KEY_STORE);
    storageRemove(localStorage, KEY_STORE);
}

function gateElement() {
    let gate = document.getElementById("membersGate");
    if (!gate) {
        gate = document.createElement("div");
        gate.id = "membersGate";
        gate.className = "members-gate";
        document.body.prepend(gate);
    }
    return gate;
}

function showGateError(message) {
    gateElement().innerHTML = `
    <div class="members-gate-card">
        <h1 class="h4 fw-bold mb-3">2026 TPC Survey · Members</h1>
        <div class="alert alert-danger mb-0">${message}</div>
    </div>`;
}

function reveal() {
    document.getElementById("membersGate")?.remove();
    document.body.classList.remove("members-locked");
    addLockButton();
}

// Lock button beside the theme toggle: forgets the saved key and re-locks.
function addLockButton() {
    const themeButton = document.getElementById("themeToggle");
    if (!themeButton || document.getElementById("membersLock")) return;
    const lock = document.createElement("button");
    lock.id = "membersLock";
    lock.type = "button";
    lock.className = "theme-toggle ms-lg-2 mt-3 mt-lg-0";
    lock.title = "Lock the members edition (forget the password on this device)";
    lock.setAttribute("aria-label", lock.title);
    lock.textContent = "🔒";
    lock.addEventListener("click", () => {
        forgetKey();
        location.reload();
    });
    themeButton.after(lock);
}

function showForm(payload, resolve) {
    const gate = gateElement();
    gate.innerHTML = `
    <form class="members-gate-card" id="membersGateForm" autocomplete="off">
        <h1 class="h4 fw-bold mb-2">2026 TPC Survey · Members</h1>
        <p class="text-muted mb-4">
            This edition includes the written responses and is shared with TPC members only.
            Enter the members' password to continue.
        </p>
        <label for="membersPassword" class="form-label fw-semibold">Password</label>
        <input type="password" id="membersPassword" class="form-control mb-3" required autofocus>
        <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" id="membersRemember">
            <label class="form-check-label" for="membersRemember">Remember on this device</label>
        </div>
        <div id="membersGateError" class="text-danger small mb-3" role="alert" hidden></div>
        <button type="submit" class="btn btn-primary w-100" id="membersUnlock">Unlock</button>
    </form>`;

    const form = gate.querySelector("#membersGateForm");
    const input = gate.querySelector("#membersPassword");
    const button = gate.querySelector("#membersUnlock");
    const error = gate.querySelector("#membersGateError");
    input.focus();

    form.addEventListener("submit", async event => {
        event.preventDefault();
        button.disabled = true;
        button.textContent = "Unlocking…";
        error.hidden = true;
        try {
            const key = await deriveKey(input.value, payload);
            const data = await decrypt(key, payload); // throws on a wrong password
            await saveKey(key, payload, gate.querySelector("#membersRemember").checked);
            reveal();
            resolve(data);
        } catch {
            error.textContent = "That password didn't work. Please try again.";
            error.hidden = false;
            button.disabled = false;
            button.textContent = "Unlock";
            input.select();
        }
    });
}

let unlocked = null;

// Resolves with the decrypted responses once the visitor is in.
function unlock() {
    if (unlocked) return unlocked;
    unlocked = (async () => {
        if (!window.crypto || !crypto.subtle) {
            showGateError("This page needs a secure (https) connection to decrypt the results.");
            throw new Error("Web Crypto unavailable");
        }

        const response = await fetch(DATA_URL).catch(() => null);
        if (!response || !response.ok) {
            showGateError("Couldn't load the encrypted results (data/responses.enc.json).");
            throw new Error("Couldn't load responses.enc.json");
        }
        const payload = await response.json();

        const savedKey = await loadSavedKey(payload);
        if (savedKey) {
            try {
                const data = await decrypt(savedKey, payload);
                reveal();
                return data;
            } catch {
                forgetKey();
            }
        }

        return new Promise(resolve => showForm(payload, resolve));
    })();
    return unlocked;
}

// --- Respondent scope: everyone, or members only (shared across pages) -----

function getScope() {
    return storageGet(localStorage, SCOPE_STORE) === "members" ? "members" : "all";
}

function applyScope(data, scope) {
    return scope === "members" ? data.filter(person => person[MEMBER_Q] === "Member") : data;
}

// "Respondents: All (N) | Members only (M)" switch, inserted before `anchor`.
function buildScopeSwitch(anchor, data, scope, onChange) {
    if (!anchor || document.getElementById("scopeControls")) return;
    const memberCount = applyScope(data, "members").length;

    const wrap = document.createElement("div");
    wrap.id = "scopeControls";
    wrap.className = "scope-controls d-flex align-items-center flex-wrap gap-2 mb-4";
    wrap.innerHTML = `
        <span class="fw-semibold me-1"><i class="fa-solid fa-user-group me-2"></i>Respondents:</span>
        <span class="btn-group" role="group" aria-label="Respondent scope">
            <input type="radio" class="btn-check" name="scope" id="scopeAll" autocomplete="off" ${scope === "all" ? "checked" : ""}>
            <label class="btn btn-outline-primary" for="scopeAll">All (${data.length})</label>
            <input type="radio" class="btn-check" name="scope" id="scopeMembers" autocomplete="off" ${scope === "members" ? "checked" : ""}>
            <label class="btn btn-outline-primary" for="scopeMembers">Members only (${memberCount})</label>
        </span>`;

    anchor.parentNode.insertBefore(wrap, anchor);

    wrap.querySelectorAll('input[name="scope"]').forEach(input => {
        input.addEventListener("change", () => {
            const next = document.getElementById("scopeMembers").checked ? "members" : "all";
            storageSet(localStorage, SCOPE_STORE, next);
            onChange(next);
        });
    });
}

return { unlock, getScope, applyScope, buildScopeSwitch, MEMBER_Q };

})();
