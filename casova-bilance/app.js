(() => {
  "use strict";

  const STORAGE_KEY = "casova-bilance:v1";
  const BACKUP_APP_ID = "casova-bilance";
  const MODES = new Set(["plus", "minus", null]);

  const elements = {
    balance: document.querySelector("#balance"),
    balanceSign: document.querySelector("#balance-sign"),
    balanceTime: document.querySelector("#balance-time"),
    plusTotal: document.querySelector("#plus-total"),
    minusTotal: document.querySelector("#minus-total"),
    statusPill: document.querySelector("#status-pill"),
    statusText: document.querySelector("#status-text"),
    runningCopy: document.querySelector("#running-copy"),
    plusButton: document.querySelector("#plus-button"),
    minusButton: document.querySelector("#minus-button"),
    pauseButton: document.querySelector("#pause-button"),
    backupOpen: document.querySelector("#backup-open"),
    backupDialog: document.querySelector("#backup-dialog"),
    exportButton: document.querySelector("#export-button"),
    importButton: document.querySelector("#import-button"),
    importInput: document.querySelector("#import-input"),
    resetOpen: document.querySelector("#reset-open"),
    resetDialog: document.querySelector("#reset-dialog"),
    resetConfirm: document.querySelector("#reset-confirm"),
    toast: document.querySelector("#toast")
  };

  let state = loadState();
  let toastTimer = null;
  let lastRenderedSecond = null;

  function defaultState() {
    return {
      plusMs: 0,
      minusMs: 0,
      mode: null,
      startedAt: null
    };
  }

  function isFiniteNonNegative(value) {
    return Number.isFinite(value) && value >= 0;
  }

  function normalizeState(candidate) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const plusMs = Number(candidate.plusMs);
    const minusMs = Number(candidate.minusMs);
    const mode = candidate.mode ?? null;
    const startedAt = candidate.startedAt === null ? null : Number(candidate.startedAt);

    if (!isFiniteNonNegative(plusMs) || !isFiniteNonNegative(minusMs) || !MODES.has(mode)) {
      return null;
    }

    if (mode !== null && (!Number.isFinite(startedAt) || startedAt <= 0)) {
      return null;
    }

    return {
      plusMs: Math.round(plusMs),
      minusMs: Math.round(minusMs),
      mode,
      startedAt: mode === null ? null : Math.round(startedAt)
    };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return defaultState();
      }
      return normalizeState(JSON.parse(saved)) ?? defaultState();
    } catch (error) {
      console.warn("Uloženou bilanci se nepodařilo načíst.", error);
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Bilanci se nepodařilo uložit.", error);
      showToast("Uložení se nepodařilo — stáhni si zálohu.");
    }
  }

  function activeElapsed(now = Date.now()) {
    if (state.mode === null || state.startedAt === null) {
      return 0;
    }
    return Math.max(0, now - state.startedAt);
  }

  function snapshot(now = Date.now()) {
    const elapsed = activeElapsed(now);
    return {
      plusMs: state.plusMs + (state.mode === "plus" ? elapsed : 0),
      minusMs: state.minusMs + (state.mode === "minus" ? elapsed : 0),
      activeMs: elapsed
    };
  }

  function settle(now = Date.now()) {
    const elapsed = activeElapsed(now);
    if (state.mode === "plus") {
      state.plusMs += elapsed;
    } else if (state.mode === "minus") {
      state.minusMs += elapsed;
    }
    state.startedAt = null;
  }

  function setMode(nextMode) {
    if (!MODES.has(nextMode)) {
      return;
    }

    const now = Date.now();
    settle(now);
    state.mode = nextMode;
    state.startedAt = nextMode === null ? null : now;
    saveState();
    lastRenderedSecond = null;
    render(now);
    vibrate();
  }

  function toggleMode(mode) {
    setMode(state.mode === mode ? null : mode);
  }

  function padTwo(value) {
    return String(value).padStart(2, "0");
  }

  function formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${padTwo(hours)}:${padTwo(minutes)}:${padTwo(seconds)}`;
  }

  function render(now = Date.now()) {
    const current = snapshot(now);
    const currentSecond = Math.floor(now / 1000);

    if (lastRenderedSecond === currentSecond) {
      return;
    }
    lastRenderedSecond = currentSecond;

    const balanceMs = current.plusMs - current.minusMs;
    const isNegative = balanceMs < 0;
    const absoluteBalance = Math.abs(balanceMs);

    elements.balanceSign.textContent = isNegative ? "−" : "+";
    elements.balanceTime.textContent = formatDuration(absoluteBalance);
    elements.balance.dataset.sign = isNegative ? "minus" : "plus";
    elements.balance.setAttribute(
      "aria-label",
      `${isNegative ? "minus" : "plus"} ${formatDuration(absoluteBalance)}`
    );
    elements.plusTotal.textContent = formatDuration(current.plusMs);
    elements.minusTotal.textContent = formatDuration(current.minusMs);

    const viewMode = state.mode ?? "paused";
    elements.statusPill.dataset.mode = viewMode;
    elements.statusText.textContent = state.mode === "plus"
      ? "Přičítám"
      : state.mode === "minus"
        ? "Odečítám"
        : "Pauza";

    if (state.mode === "plus") {
      elements.runningCopy.textContent = `Tato jízda +${formatDuration(current.activeMs)}`;
    } else if (state.mode === "minus") {
      elements.runningCopy.textContent = `Tato jízda −${formatDuration(current.activeMs)}`;
    } else {
      elements.runningCopy.textContent = current.plusMs === 0 && current.minusMs === 0
        ? "Spusť přičítání nebo odečítání."
        : "Časomíra stojí.";
    }

    elements.plusButton.setAttribute("aria-pressed", String(state.mode === "plus"));
    elements.minusButton.setAttribute("aria-pressed", String(state.mode === "minus"));
    elements.pauseButton.disabled = state.mode === null;

    const signedTitle = `${isNegative ? "−" : "+"}${formatDuration(absoluteBalance)}`;
    document.title = state.mode === null
      ? `${signedTitle} · Časová bilance`
      : `${state.mode === "plus" ? "+" : "−"} běží · ${signedTitle}`;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2800);
  }

  function vibrate() {
    if ("vibrate" in navigator) {
      navigator.vibrate(12);
    }
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  function settledBackupState(now = Date.now()) {
    const current = snapshot(now);
    return {
      plusMs: Math.round(current.plusMs),
      minusMs: Math.round(current.minusMs),
      mode: state.mode,
      startedAt: state.mode === null ? null : now
    };
  }

  function exportBackup() {
    const now = Date.now();
    const backup = {
      app: BACKUP_APP_ID,
      version: 1,
      exportedAt: new Date(now).toISOString(),
      data: settledBackupState(now)
    };
    const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `casova-bilance-${date}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Záloha je stažená.");
  }

  async function importBackup(file) {
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.app !== BACKUP_APP_ID || parsed?.version !== 1) {
        throw new Error("Neznámý formát zálohy.");
      }

      const restored = normalizeState(parsed.data);
      if (!restored) {
        throw new Error("Záloha neobsahuje platná data.");
      }

      state = {
        ...restored,
        startedAt: restored.mode === null ? null : Date.now()
      };
      saveState();
      lastRenderedSecond = null;
      render();
      closeDialog(elements.backupDialog);
      showToast("Bilance byla obnovena.");
    } catch (error) {
      console.error(error);
      showToast("Tuhle zálohu se nepodařilo načíst.");
    } finally {
      elements.importInput.value = "";
    }
  }

  elements.plusButton.addEventListener("click", () => toggleMode("plus"));
  elements.minusButton.addEventListener("click", () => toggleMode("minus"));
  elements.pauseButton.addEventListener("click", () => setMode(null));

  elements.backupOpen.addEventListener("click", () => openDialog(elements.backupDialog));
  elements.exportButton.addEventListener("click", exportBackup);
  elements.importButton.addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", () => importBackup(elements.importInput.files?.[0]));

  elements.resetOpen.addEventListener("click", () => openDialog(elements.resetDialog));
  elements.resetConfirm.addEventListener("click", () => {
    state = defaultState();
    saveState();
    lastRenderedSecond = null;
    render();
    closeDialog(elements.resetDialog);
    showToast("Bilance je vynulovaná.");
    vibrate();
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.querySelector(`#${button.dataset.closeDialog}`);
      if (dialog) {
        closeDialog(dialog);
      }
    });
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        closeDialog(dialog);
      }
    });
  });

  window.addEventListener("pagehide", saveState);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      lastRenderedSecond = null;
      render();
    }
  });

  window.setInterval(render, 250);
  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("Offline režim se nepodařilo zapnout.", error);
      });
    });
  }
})();
