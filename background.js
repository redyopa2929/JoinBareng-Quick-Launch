// background.js — Firefox/Chrome compatible, hardened

// ==== Defaults & Targets ====
const DEFAULTS = {
  openIn: "newtab",            // "newtab" | "current"
  defaultTarget: "home",       // "home" | "marketplace" | "dashboard" | "help"
  attachUTM: true,
  utm: { source: "ext", medium: "toolbar", campaign: "quicklaunch" },
  clickAction: "popup",        // "popup" | "open"
  showContextMenu: true
};

const TARGETS = {
  home: "https://joinbareng.com/",
  marketplace: "https://joinbareng.com/id/marketplace",
  dashboard: "https://joinbareng.com/login",
  help: "https://joinbareng.com/help"
};

// Storage area fallback (sync → local)
const storageArea = (chrome.storage && chrome.storage.sync) ? chrome.storage.sync : chrome.storage.local;
// Context menu API alias (Firefox prefer menus)
const Ctx = chrome.menus || chrome.contextMenus;

// ==== Utils ====
function withUTM(url, { attachUTM, utm }) {
  try {
    if (!attachUTM) return url;
    const u = new URL(url);
    if (utm?.source) u.searchParams.set("utm_source", utm.source);
    if (utm?.medium) u.searchParams.set("utm_medium", utm.medium);
    if (utm?.campaign) u.searchParams.set("utm_campaign", utm.campaign);
    return u.toString();
  } catch {
    return url;
  }
}

function getSettings() {
  return new Promise((resolve) => {
    storageArea.get({ jbql_settings: DEFAULTS }, (v) => {
      resolve({ ...DEFAULTS, ...(v?.jbql_settings || {}) });
    });
  });
}

async function openJoinBareng(targetKey) {
  const s = await getSettings();
  const key = targetKey || s.defaultTarget || "home";
  const base = TARGETS[key] || TARGETS.home;
  const url = withUTM(base, s);

  if (s.openIn === "current") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.update(tab.id, { url });
      return;
    }
  }
  await chrome.tabs.create({ url, active: true });
}

// ==== Context menu (debounced, duplicate-safe) ====
let buildingMenus = false;
let ensureMenuTimer = null;

function removeAllMenus() {
  return new Promise((resolve) => {
    try {
      Ctx.removeAll(() => { void chrome.runtime.lastError; resolve(); });
    } catch { resolve(); }
  });
}

function safeCreate(item) {
  return new Promise((resolve) => {
    try {
      Ctx.create(item, () => { void chrome.runtime.lastError; resolve(); });
    } catch { resolve(); }
  });
}

async function ensureContextMenu() {
  if (buildingMenus) return;
  buildingMenus = true;
  try {
    const s = await getSettings();
    await removeAllMenus();

    if (!s.showContextMenu) return;

    await safeCreate({
      id: "jbql-root",
      title: "Buka JoinBareng",
      contexts: ["page", "selection", "link", "editable", "image", "video", "audio"]
    });
    await safeCreate({ id: "jbql-home",        parentId: "jbql-root", title: "Beranda",      contexts: ["all"] });
    await safeCreate({ id: "jbql-marketplace", parentId: "jbql-root", title: "Marketplace",  contexts: ["all"] });
    await safeCreate({ id: "jbql-dashboard",   parentId: "jbql-root", title: "Login/Dashboard", contexts: ["all"] });
    await safeCreate({ id: "jbql-help",        parentId: "jbql-root", title: "Bantuan",      contexts: ["all"] });
  } finally {
    buildingMenus = false;
  }
}

function ensureContextMenuDebounced() {
  clearTimeout(ensureMenuTimer);
  ensureMenuTimer = setTimeout(() => { ensureContextMenu(); }, 100);
}

// ==== Event wiring ====
(Ctx.onClicked || chrome.contextMenus.onClicked).addListener(async (info) => {
  switch (info.menuItemId) {
    case "jbql-root":        await openJoinBareng(); break;
    case "jbql-home":        await openJoinBareng("home"); break;
    case "jbql-marketplace": await openJoinBareng("marketplace"); break;
    case "jbql-dashboard":   await openJoinBareng("dashboard"); break;
    case "jbql-help":        await openJoinBareng("help"); break;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-joinbareng") await openJoinBareng();
});

chrome.action.onClicked.addListener(async () => {
  const s = await getSettings();
  if (s.clickAction === "open") await openJoinBareng();
});

// Install/update → seed defaults + build menu
chrome.runtime.onInstalled.addListener(async () => {
  const s = await getSettings();
  await new Promise((r) => storageArea.set({ jbql_settings: s }, r));
  ensureContextMenuDebounced();
});

// Browser startup
chrome.runtime.onStartup?.addListener(() => { ensureContextMenuDebounced(); });

// Rebuild menu on settings change
chrome.storage.onChanged.addListener((changes, area) => {
  if ((area === "sync" || area === "local") && changes.jbql_settings) ensureContextMenuDebounced();
});

// Messages from popup to open specific target
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "open") {
    openJoinBareng(msg.target).then(() => sendResponse(true));
    return true;
  }
});
