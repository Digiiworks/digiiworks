

## Plan: Add Onboarding Quizzes for All Remaining Services

### Summary
Add 10 service-specific onboarding quiz configurations to `src/lib/service-onboarding.ts` for every service that doesn't already have one. Each quiz will follow the same pattern as "Custom Web Development" -- service-specific requirement-gathering questions followed by budget and timeline steps.

### File Changed
**`src/lib/service-onboarding.ts`** -- Add entries for all 10 remaining services:

| Service | Slug | Quiz Focus |
|---|---|---|
| Responsive Design | `responsive-design` | Current site issues, target devices, design priorities, framework prefs |
| UX/UI Design | `ux-ui-design` | Project scope (new vs redesign), deliverables needed, style direction, user research |
| CMS Integration | `cms-integration` | CMS platform preference, content types, team size, integration needs |
| Rent-A-Website | `rent-a-website` | Business type, page count, features needed, existing branding |
| Data-Driven SEO | `data-driven-seo` | Current SEO maturity, goals (traffic/leads/rankings), industry, content status |
| Performance Optimization | `performance-optimization` | Current site tech, known issues, hosting setup, traffic volume |
| Google & Social Media Ads | `google-social-media-ads` | Platforms, monthly budget, goals (leads/sales/awareness), past experience |
| Market & Competitor Research | `market-competitor-research` | Industry, number of competitors, research goals, deliverable format |
| AI-Powered Social Media | `ai-powered-social-media` | Platforms active on, posting frequency, content types, brand voice |
| n8n Workflow Automation | `n8n-workflow-automation` | Tools in stack, processes to automate, volume, technical comfort |
| Content Strategy | `content-strategy` | Content types needed, publishing frequency, existing content, target audience |

Each config will have 4-6 quiz steps with service-relevant questions, plus the shared budget and timeline steps at the end. All will use the same accent colors from `service-pages.ts`.

No other files need changing -- the routing (`/services/:slug/start`), form component (`ServiceOnboarding.tsx`), and CTA link (`ServiceDetail.tsx`) already work generically with any slug that has a config entry.

