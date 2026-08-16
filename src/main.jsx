import ReactDOM from "react-dom/client";

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
