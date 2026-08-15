import ReactDOM from "react-dom/client";

// TEMP DEBUG - REMOVE BEFORE FINAL RELEASE
const renderDebugError = (message, label) => {
  const existing = document.getElementById("temp-debug-error-overlay");
  if (existing) {
    existing.remove();
  }

  const container = document.createElement("div");
  container.id = "temp-debug-error-overlay";
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.background = "#ffffff";
  container.style.color = "#000000";
  container.style.padding = "24px";
  container.style.overflow = "auto";
  container.style.fontFamily = "monospace";
  container.style.fontSize = "14px";
  container.style.whiteSpace = "pre-wrap";
  container.style.zIndex = "999999";
  container.style.boxSizing = "border-box";

  const heading = document.createElement("div");
  heading.textContent = `TEMP DEBUG ERROR: ${label}`;
  heading.style.fontWeight = "700";
  heading.style.marginBottom = "12px";

  const details = document.createElement("pre");
  details.textContent = message;
  details.style.margin = "0";
  details.style.whiteSpace = "pre-wrap";
  details.style.wordBreak = "break-word";

  container.appendChild(heading);
  container.appendChild(details);
  document.body.appendChild(container);
};

window.addEventListener("error", (event) => {
  const message = event.error
    ? event.error.stack || event.error.message || String(event.error)
    : event.message || "Unknown error";
  renderDebugError(message, "uncaught error");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error
    ? event.reason.stack || event.reason.message
    : String(event.reason);
  renderDebugError(reason, "unhandled promise rejection");
});

async function startApp() {
  try {
    // Must run before App.jsx's module code executes any storage calls.
    const { installStorageShim } = await import("./storageShim.js");
    installStorageShim();
  } catch (error) {
    const message = error instanceof Error
      ? error.stack || error.message
      : String(error);
    renderDebugError(message, "storageShim install error");
    throw error;
  }

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
