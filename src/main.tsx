import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/platform-fonts.css";
import "./styles/theme.css";

const api = window.writenow;

const safeSend = (channel: string, payload?: unknown) => {
  try {
    api?.send(channel, payload);
  } catch {
    // ignore
  }
};

safeSend("app:renderer-boot", { href: window.location.href });

window.addEventListener("error", (event) => {
  safeSend("app:renderer-error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: (event.error && event.error.stack) || String(event.error || ""),
  });
});

window.addEventListener("unhandledrejection", (event) => {
  safeSend("app:renderer-unhandledrejection", {
    reason: (event.reason && event.reason.stack) || String(event.reason || ""),
  });
});

createRoot(document.getElementById("root")!).render(<App />);
safeSend("app:renderer-ready");
