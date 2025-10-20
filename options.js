const DEFAULTS = {
  openIn: "newtab",
  defaultTarget: "home",
  attachUTM: true,
  utm: { source: "ext", medium: "toolbar", campaign: "quicklaunch" },
  clickAction: "popup",
  showContextMenu: true
};

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

(async function init() {
  const s = await getSettings();
  document.getElementById("defaultTarget").value = s.defaultTarget;
  document.getElementById("openIn").value = s.openIn;
  document.getElementById("clickAction").value = s.clickAction;
  document.getElementById("attachUTM").checked = !!s.attachUTM;
  document.getElementById("utm_source").value = s.utm?.source || "";
  document.getElementById("utm_medium").value = s.utm?.medium || "";
  document.getElementById("utm_campaign").value = s.utm?.campaign || "";
  document.getElementById("showContextMenu").checked = !!s.showContextMenu;

  document.getElementById("save").addEventListener("click", async () => {
    const newS = {
      ...s,
      defaultTarget: document.getElementById("defaultTarget").value,
      openIn: document.getElementById("openIn").value,
      clickAction: document.getElementById("clickAction").value,
      attachUTM: document.getElementById("attachUTM").checked,
      utm: {
        source: document.getElementById("utm_source").value || "",
        medium: document.getElementById("utm_medium").value || "",
        campaign: document.getElementById("utm_campaign").value || ""
      },
      showContextMenu: document.getElementById("showContextMenu").checked
    };

    await saveSettings(newS);
    const st = document.getElementById("status");
    st.textContent = "Tersimpan ✓";
    setTimeout(() => (st.textContent = ""), 1500);
  });
})();
