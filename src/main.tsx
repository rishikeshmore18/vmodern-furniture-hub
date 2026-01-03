import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
if (supabaseUrl && typeof document !== "undefined") {
  try {
    const origin = new URL(supabaseUrl).origin;
    const existing = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
    if (!existing) {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      link.crossOrigin = "";
      document.head.appendChild(link);
    }
  } catch {
    // Ignore invalid URL or DOM errors
  }
}

createRoot(document.getElementById("root")!).render(<App />);
