import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import PageMeta from "./components/PageMeta";
import Layout from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import { ContentPageSkeleton, FormPageSkeleton, LegalPageSkeleton, AdminPageSkeleton } from "./components/PageSkeleton";

// Eager imports for main nav pages — instant navigation
import Index from "./pages/Index";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import GetStarted from "./pages/GetStarted";
import Blog from "./pages/Blog";
import AIAutomation from "./pages/AIAutomation";

// Eager imports for admin pages — fast admin navigation
import Dashboard from "./pages/admin/Dashboard";
import Leads from "./pages/admin/Leads";
import Posts from "./pages/admin/Posts";
import PageContent from "./pages/admin/PageContent";
import UsersAdmin from "./pages/admin/Users";
import InvoicesAdmin from "./pages/admin/Invoices";
import ClientsAdmin from "./pages/admin/Clients";
import ProductsAdmin from "./pages/admin/Products";
import SettingsAdmin from "./pages/admin/Settings";

// Lazy imports for low-traffic / detail pages
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const InvoicePrint = lazy(() => import("./pages/InvoicePrint"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PageMeta />
            <Routes>
              {/* Public site */}
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/services/:slug" element={<Suspense fallback={<ContentPageSkeleton />}><ServiceDetail /></Suspense>} />
                  <Route path="/ai" element={<AIAutomation />} />
                  <Route path="/get-started" element={<GetStarted />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<Suspense fallback={<ContentPageSkeleton />}><BlogPost /></Suspense>} />
                  <Route path="/privacy" element={<Suspense fallback={<LegalPageSkeleton />}><Privacy /></Suspense>} />
                  <Route path="/terms" element={<Suspense fallback={<LegalPageSkeleton />}><Terms /></Suspense>} />
                </Route>

                {/* Auth */}
                <Route path="/auth" element={<Suspense fallback={<FormPageSkeleton />}><Auth /></Suspense>} />
                <Route path="/reset-password" element={<Suspense fallback={<FormPageSkeleton />}><ResetPassword /></Suspense>} />
                <Route path="/client" element={<Navigate to="/admin" replace />} />
                <Route path="/invoice/:id" element={
                  <Suspense fallback={<ContentPageSkeleton />}><InvoicePrint /></Suspense>
                } />

                {/* Admin CRM */}
                <Route path="/admin" element={
                  <ProtectedRoute requiredRoles={['admin', 'editor', 'client']}>
                    <Suspense fallback={<PageLoader />}><AdminLayout /></Suspense>
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="leads" element={<Leads />} />
                  <Route path="posts" element={
                    <ProtectedRoute requiredRoles={['admin', 'editor']}>
                      <Posts />
                    </ProtectedRoute>
                  } />
                  <Route path="content" element={
                    <ProtectedRoute requiredRoles={['admin', 'editor']}>
                      <PageContent />
                    </ProtectedRoute>
                  } />
                  <Route path="users" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <UsersAdmin />
                    </ProtectedRoute>
                  } />
                  <Route path="invoices" element={
                    <ProtectedRoute requiredRoles={['admin', 'client']}>
                      <InvoicesAdmin />
                    </ProtectedRoute>
                  } />
                  <Route path="clients" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <ClientsAdmin />
                    </ProtectedRoute>
                  } />
                  <Route path="products" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <ProductsAdmin />
                    </ProtectedRoute>
                  } />
                  <Route path="settings" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <SettingsAdmin />
                    </ProtectedRoute>
                  } />
                </Route>

                <Route path="*" element={<Layout />}>
                  <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
                </Route>
              </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
