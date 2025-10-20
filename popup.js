const DEFAULTS = {
  openIn: "newtab",
  defaultTarget: "home",
  attachUTM: true,
  utm: { source: "ext", medium: "toolbar", campaign: "quicklaunch" },
  clickAction: "popup"
};

// storage area fallback
const area = (chrome.storage && chrome.storage.sync) ? chrome.storage.sync : chrome.storage.local;

function getSettings() {
  return new Promise((resolve) => {
    area.get({ jbql_settings: DEFAULTS }, (v) => {
      resolve({ ...DEFAULTS, ...(v?.jbql_settings || {}) });
    });
  });
}

function saveSettings(s) {
  return new Promise((resolve) => {
    area.set({ jbql_settings: s }, resolve);
  });
}

async function openTarget(target) {
  await chrome.runtime.sendMessage({ type: "open", target });
}

chrome.runtime.onMessage?.addListener(() => {});

document.querySelectorAll(".btn[data-target]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    await openTarget(btn.dataset.target);
    window.close();
  });
});

document.getElementById("openOptions").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

(async function init() {
  const s = await getSettings();
  document.getElementById("openIn").value = s.openIn;
  document.getElementById("clickAction").value = s.clickAction;
  document.getElementById("defaultTarget").value = s.defaultTarget;
  document.getElementById("attachUTM").checked = !!s.attachUTM;
  document.getElementById("utm_source").value = s.utm?.source || "";
  document.getElementById("utm_medium").value = s.utm?.medium || "";
  document.getElementById("utm_campaign").value = s.utm?.campaign || "";

  document.getElementById("save").addEventListener("click", async () => {
    const newS = {
      ...s,
      openIn: document.getElementById("openIn").value,
      clickAction: document.getElementById("clickAction").value,
      defaultTarget: document.getElementById("defaultTarget").value,
      attachUTM: document.getElementById("attachUTM").checked,
      utm: {
        source: document.getElementById("utm_source").value || "",
        medium: document.getElementById("utm_medium").value || "",
        campaign: document.getElementById("utm_campaign").value || ""
      }
    };
    await saveSettings(newS);
    document.getElementById("save").textContent = "Tersimpan ✓";
    setTimeout(() => (document.getElementById("save").textContent = "Simpan"), 1200);
  });
})();
