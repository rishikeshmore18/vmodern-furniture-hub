import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import FloorSamples from "./pages/FloorSamples";
import OnlineInventory from "./pages/OnlineInventory";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";

// Lazy load heavy routes to reduce initial bundle size
const Admin = lazy(() => import("./pages/Admin"));
const Auth = lazy(() => import("./pages/Auth"));
const Invoice = lazy(() => import("./pages/Invoice"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient();

// Use Vite's configured base URL so routing works on both GitHub Pages and custom domains
const basename = (() => {
  const base = import.meta.env.BASE_URL || "/";
  const trimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return trimmed === "/" ? "" : trimmed;
})();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={basename}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/floor-samples" element={<FloorSamples />} />
            <Route path="/online-inventory" element={<OnlineInventory />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route
              path="/admin"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Admin />
                </Suspense>
              }
            />
            <Route
              path="/auth"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Auth />
                </Suspense>
              }
            />
            <Route
              path="/invoice"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Invoice />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
