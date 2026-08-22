import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

// TEMP DEBUG - REMOVE BEFORE FINAL RELEASE
// On-screen overlay for TEMP DEBUG console output, so logs can be read without Safari's remote inspector.
const debugLogs = [];
const origLog = console.log;
const origError = console.error;
function renderDebugPanel() {
  let panel = document.getElementById("temp-debug-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "temp-debug-panel";
    panel.style.cssText = "position:fixed;top:0;left:0;right:0;max-height:50vh;overflow-y:auto;background:#000;color:#0f0;font-family:monospace;font-size:11px;padding:8px;z-index:999999;white-space:pre-wrap;";
    document.body.appendChild(panel);
  }
  panel.textContent = debugLogs.join("\n\n");
}
console.log = (...args) => {
  origLog(...args);
  const msg = args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
  if (msg.includes("TEMP DEBUG")) {
    debugLogs.push(msg);
    renderDebugPanel();
  }
};
console.error = (...args) => {
  origError(...args);
  const msg = args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
  debugLogs.push("ERROR: " + msg);
  renderDebugPanel();
};

if (Capacitor.isNativePlatform()) {
  Keyboard.setResizeMode({ mode: "none" });
}

async function startApp() {
  // Must run before App.jsx's module code executes any storage calls.
  const { installStorageShim } = await import("./storageShim.js");
  installStorageShim();

  const { default: App } = await import("./App.jsx");

  // Note: intentionally NOT wrapped in <React.StrictMode>. The Claude.ai
  // artifact environment this app was built and tested in does not
  // double-invoke effects the way StrictMode does in a standard Vite/CRA
  // dev server, and at least one effect in App.jsx (the Stuck Flow's
  // mount-time STUCK_FLOW_ENTERED logging) is not idempotent against that
  // — StrictMode would cause it to log a duplicate evidence event on every
  // mount in development. See MIGRATION_AUDIT.md for the full writeup.
  // Safe to re-enable once that effect (and any others like it) are guarded.
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}

startApp();
