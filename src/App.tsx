import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import PageMeta from "./components/PageMeta";
import Layout from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";

const Index = lazy(() => import("./pages/Index"));
const Services = lazy(() => import("./pages/Services"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const Contact = lazy(() => import("./pages/Contact"));
const GetStarted = lazy(() => import("./pages/GetStarted"));
const Blog = lazy(() => import("./pages/Blog"));
const AIAutomation = lazy(() => import("./pages/AIAutomation"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Leads = lazy(() => import("./pages/admin/Leads"));
const Posts = lazy(() => import("./pages/admin/Posts"));
const PageContent = lazy(() => import("./pages/admin/PageContent"));
const UsersAdmin = lazy(() => import("./pages/admin/Users"));
const InvoicesAdmin = lazy(() => import("./pages/admin/Invoices"));
const ClientsAdmin = lazy(() => import("./pages/admin/Clients"));
const ProductsAdmin = lazy(() => import("./pages/admin/Products"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PageMeta />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public site */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/services/:slug" element={<ServiceDetail />} />
                  <Route path="/ai" element={<AIAutomation />} />
                  <Route path="/get-started" element={<GetStarted />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                </Route>

                {/* Auth */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/client" element={
                  <ProtectedRoute requiredRoles={['client']}>
                    <ClientDashboard />
                  </ProtectedRoute>
                } />

                {/* Admin CRM */}
                <Route path="/admin" element={
                  <ProtectedRoute requiredRoles={['admin', 'editor', 'client']}>
                    <AdminLayout />
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
                </Route>

                <Route path="*" element={<Layout />}>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
