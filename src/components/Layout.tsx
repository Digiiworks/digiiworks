import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import ScrollToTop from './ScrollToTop';
import InteractiveHeroBg from './InteractiveHeroBg';

const InlineLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const Layout = () => (
  <div className="flex min-h-screen flex-col bg-background text-foreground">
    <InteractiveHeroBg />
    <Navbar />
    <main className="relative z-10 flex-1">
      <Suspense fallback={<InlineLoader />}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <Outlet />
        </motion.div>
      </Suspense>
    </main>
    <Footer />
    <ScrollToTop />
  </div>
);

export default Layout;
