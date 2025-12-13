import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import FloorSamples from "./pages/FloorSamples";
import OnlineInventory from "./pages/OnlineInventory";
import ProductDetail from "./pages/ProductDetail";
import Admin from "./pages/Admin";
import Invoice from "./pages/Invoice";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Get the base path for GitHub Pages
const basename = import.meta.env.PROD ? '/vmodern-furniture-hub' : '';

const App = () => (
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
          <Route path="/admin" element={<Admin />} />
          <Route path="/invoice" element={<Invoice />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
