// ─── Site Identity ───
export const SITE_NAME = 'Digiiworks';
export const SITE_TAGLINE = 'Human Creativity. Autonomous Execution.';
export const SITE_DESCRIPTION = 'Digiiworks is an autonomous digital agency offering custom web development, AI-powered automation, SEO, and workflow engineering.';
export const SITE_URL = 'https://digiiworks.co';

// ─── Navigation ───
export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/ai', label: 'AI & Automation' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
] as const;

// ─── Service Options (Contact Form) ───
export const SERVICE_OPTIONS = [
  'Custom Web Development',
  'Responsive Design',
  'UX/UI Design',
  'CMS Integration',
  'Rent-A-Website',
  'Data-Driven SEO',
  'Performance Optimization',
  'Google & Social Media Ads',
  'Market & Competitor Research',
  'AI-Powered Social Media',
  'n8n Workflow Automation',
  'Content Strategy',
] as const;

// ─── Agents ───
export const AGENTS = [
  {
    name: 'Dex',
    role: 'AI Concierge',
    desc: '24/7 lead qualification, scheduling, and client onboarding. Dex never sleeps — it handles first-touch conversations, qualifies prospects, and books meetings while you focus on delivery.',
    color: 'text-neon-mint' as const,
    bgColor: 'bg-neon-mint' as const,
    glowHsl: '106 100% 55%',
  },
  {
    name: 'Vantage',
    role: 'Autonomous SEO',
    desc: 'Monitors search trends, competitor movements, and algorithm shifts in real-time. Vantage feeds insights to Pixel so your content stays ahead of the curve — every single day.',
    color: 'text-neon-blue' as const,
    bgColor: 'bg-neon-blue' as const,
    glowHsl: '184 100% 50%',
  },
  {
    name: 'Pixel',
    role: 'Creative Engine',
    desc: "Generates social media assets, blog visuals, and marketing collateral on demand. Pixel turns Vantage's data into scroll-stopping content — no human bottleneck required.",
    color: 'text-neon-purple' as const,
    bgColor: 'bg-neon-purple' as const,
    glowHsl: '175 100% 42%',
  },
  {
    name: 'Forge',
    role: 'Infrastructure',
    desc: 'Manages deployments, server health, and system updates across your entire stack. Forge keeps the lights on so your team can focus on growth.',
    color: 'text-neon-blue' as const,
    bgColor: 'bg-neon-blue' as const,
    glowHsl: '184 100% 50%',
  },
] as const;

// ─── Connector Apps (n8n section) ───
export const CONNECTOR_APPS = ['Slack', 'Gmail', 'HubSpot', 'Notion', 'Google Sheets', 'Stripe'] as const;

// ─── Pillars ───
export const PILLARS = [
  {
    id: 'architecture' as const,
    title: 'Digital Architecture',
    label: 'Pillar 01',
    accentColor: 'text-neon-blue',
    glowHsl: '184 100% 50%',
    link: '/services',
    description: 'Custom Web Development, Responsive Design, UX/UI, CMS Integration, and the Rent-A-Website model.',
    services: [
      { name: 'Custom Web Development', desc: 'Bespoke websites built from the ground up to match your vision.' },
      { name: 'Responsive Design', desc: 'Pixel-perfect experiences across every device and screen size.' },
      { name: 'UX/UI Design', desc: 'Intuitive interfaces designed around user behavior and business goals.' },
      { name: 'CMS Integration', desc: 'Headless or traditional CMS setups for effortless content management.' },
      { name: 'Rent-A-Website', desc: 'Professional site, zero upfront cost. Pay monthly, worry about nothing.' },
    ],
  },
  {
    id: 'growth' as const,
    title: 'Growth Engine',
    label: 'Pillar 02',
    accentColor: 'text-neon-blue',
    glowHsl: '184 100% 50%',
    link: '/services',
    description: 'Data-Driven SEO, Performance Optimization, Google & Social Media Ads, and Market Research.',
    services: [
      { name: 'Data-Driven SEO', desc: 'Keyword strategy, technical audits, and content optimization for organic growth.' },
      { name: 'Performance Optimization', desc: 'Speed, Core Web Vitals, and server-level tuning for peak performance.' },
      { name: 'Google & Social Media Ads', desc: 'Targeted ad campaigns across Google, Meta, and beyond.' },
      { name: 'Market & Competitor Research', desc: 'Deep-dive analysis to find gaps and opportunities in your market.' },
    ],
  },
  {
    id: 'autonomous' as const,
    title: 'Autonomous Agency',
    label: 'Pillar 03',
    accentColor: 'text-neon-purple',
    glowHsl: '280 99% 53%',
    link: '/ai',
    description: 'AI-Powered Social Media, n8n Workflow Automation, and Content Strategy by Vantage & Pixel.',
    services: [
      { name: 'AI-Powered Social Media', desc: 'Content creation and scheduling driven by AI agents.' },
      { name: 'n8n Workflow Automation', desc: 'Automate repetitive tasks across your entire tech stack.' },
      { name: 'Content Strategy', desc: 'Our agents Vantage & Pixel handle research, copywriting, and visuals.' },
    ],
  },
] as const;

// ─── Stats ───
export const STATS = [
  { label: 'Projects Delivered', value: 50, suffix: '+' },
  { label: 'Uptime', value: 99.9, suffix: '%' },
  { label: 'AI Agents', value: 77, suffix: '' },
  { label: 'Automations Running', value: 120, suffix: '+' },
] as const;

// ─── Tech Stack ───
export const TECH_STACK = [
  'React', 'TypeScript', 'Next.js', 'Node.js', 'n8n', 'Supabase',
  'Vercel', 'Docker', 'Tailwind CSS', 'Framer Motion', 'PostgreSQL', 'Stripe',
] as const;

// ─── Mock Agent Logs (fallback) ───
export const MOCK_AGENT_LOGS = [
  { id: '1', agent: 'Dex', message: 'Analyzing new lead from digiiworks.co...' },
  { id: '2', agent: 'Vantage', message: "Scraping SEO trends for 'AI Automation 2026'..." },
  { id: '3', agent: 'Forge', message: 'Deploying system update to KVM 2 node...' },
  { id: '4', agent: 'Pixel', message: 'Generating social assets for Q1 campaign...' },
  { id: '5', agent: 'Dex', message: 'Scheduling follow-up for qualified lead #0847...' },
] as const;

// ─── SEO Meta per Page ───
export const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Digiiworks — Autonomous Digital Agency',
    description: 'Build, automate, and dominate. Digiiworks delivers custom web development, AI-powered automation, and data-driven SEO for brands ready to scale.',
  },
  '/services': {
    title: 'Services — Digiiworks',
    description: 'Explore our three pillars: Digital Architecture, Growth Engine, and Autonomous Agency. Custom dev, SEO, AI automation, and more.',
  },
  '/ai': {
    title: 'AI & Automation — Digiiworks',
    description: 'Human creativity meets autonomous execution. Meet Dex, Vantage, Pixel & Forge — our AI agents running 24/7 for your brand.',
  },
  '/blog': {
    title: 'Blog — Digiiworks',
    description: 'Insights on web development, AI automation, SEO strategy, and the future of autonomous digital agencies.',
  },
  '/contact': {
    title: 'Contact — Digiiworks',
    description: 'Ready to automate your growth? Get in touch with Digiiworks for a consultation on web development, SEO, or AI automation.',
  },
  '/get-started': {
    title: 'Get Started — Digiiworks',
    description: 'Answer 5 quick questions and we\'ll scope your project. Web development, SEO, AI automation — let\'s find the right fit.',
  },
};
