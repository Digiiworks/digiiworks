// Service-specific onboarding quiz configurations

export interface QuizOption {
  label: string;
  desc?: string;
}

export interface QuizStep {
  question: string;
  subtitle?: string;
  type: 'single' | 'multi';
  key: string;
  options: QuizOption[];
}

export interface ServiceOnboardingConfig {
  serviceSlug: string;
  serviceName: string;
  accentColor: string;
  glowHsl: string;
  headerLabel: string;
  headline: string;
  subtitle: string;
  steps: QuizStep[];
}

export const SERVICE_ONBOARDING: Record<string, ServiceOnboardingConfig> = {
  'custom-web-development': {
    serviceSlug: 'custom-web-development',
    serviceName: 'Custom Web Development',
    accentColor: 'text-neon-blue',
    glowHsl: '184 100% 50%',
    headerLabel: '// custom_web_dev :: onboarding',
    headline: "Let's scope your web project",
    subtitle: '6 quick steps — takes under 2 minutes.',
    steps: [
      {
        question: 'What type of website do you need?',
        subtitle: 'Select the best match.',
        type: 'single',
        key: 'project_type',
        options: [
          { label: 'Business / Corporate Site', desc: 'Company website with multiple pages' },
          { label: 'SaaS / Web Application', desc: 'Interactive app with user accounts' },
          { label: 'E-Commerce Store', desc: 'Online shop with product catalogue' },
          { label: 'Landing Page / Microsite', desc: 'Single focused page for a campaign' },
          { label: 'Portfolio / Personal Brand', desc: 'Showcase your work or personal brand' },
          { label: 'Blog / Content Platform', desc: 'Publishing-focused with CMS' },
        ],
      },
      {
        question: 'Do you have an existing website?',
        subtitle: 'This helps us understand your starting point.',
        type: 'single',
        key: 'existing_site',
        options: [
          { label: 'No — starting from scratch', desc: 'Brand new build' },
          { label: 'Yes — needs a complete redesign', desc: 'Rebuild from the ground up' },
          { label: 'Yes — needs improvements', desc: 'Enhance and optimise what exists' },
          { label: 'Yes — migrating to new tech', desc: 'Moving to a modern framework' },
        ],
      },
      {
        question: 'Which features are essential?',
        subtitle: 'Select all that apply.',
        type: 'multi',
        key: 'features_needed',
        options: [
          { label: 'Contact / Lead Forms' },
          { label: 'User Authentication' },
          { label: 'Payment / Checkout' },
          { label: 'CMS / Blog' },
          { label: 'Admin Dashboard' },
          { label: 'API Integrations' },
          { label: 'Search Functionality' },
          { label: 'Analytics & Tracking' },
          { label: 'Multi-language Support' },
          { label: 'Booking / Scheduling' },
        ],
      },
      {
        question: 'Any design preferences?',
        subtitle: 'Select all that resonate.',
        type: 'multi',
        key: 'design_prefs',
        options: [
          { label: 'Minimal & Clean' },
          { label: 'Bold & Colorful' },
          { label: 'Dark Theme / Techy' },
          { label: 'Corporate & Professional' },
          { label: 'Creative / Artistic' },
          { label: 'Match existing branding' },
        ],
      },
      {
        question: "What's your budget range?",
        type: 'single',
        key: 'budget',
        options: [
          { label: 'Under $1K', desc: 'Lean & focused' },
          { label: '$1K – $5K', desc: 'Most popular range' },
          { label: '$5K – $10K', desc: 'Premium builds' },
          { label: '$10K+', desc: 'Enterprise-grade' },
        ],
      },
      {
        question: "What's your timeline?",
        type: 'single',
        key: 'timeline',
        options: [
          { label: 'ASAP', desc: 'Need it yesterday' },
          { label: '1 – 3 months', desc: 'Standard timeline' },
          { label: '3 – 6 months', desc: 'No rush' },
          { label: 'Just exploring', desc: 'Gathering info' },
        ],
      },
    ],
  },
};

export function getServiceOnboarding(slug: string): ServiceOnboardingConfig | undefined {
  return SERVICE_ONBOARDING[slug];
}
