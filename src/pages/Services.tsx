import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const pillars = [
  {
    title: 'Pillar 1: Digital Architecture',
    services: [
      { name: 'Custom Web Development', desc: 'Bespoke websites built from the ground up to match your vision.' },
      { name: 'Responsive Design', desc: 'Pixel-perfect experiences across every device and screen size.' },
      { name: 'UX/UI Design', desc: 'Intuitive interfaces designed around user behavior and business goals.' },
      { name: 'CMS Integration', desc: 'Headless or traditional CMS setups for effortless content management.' },
      { name: 'Rent-A-Website', desc: 'Get a professional site with zero upfront cost — pay monthly, own nothing, worry about nothing.' },
    ],
  },
  {
    title: 'Pillar 2: Growth Engine',
    services: [
      { name: 'Data-Driven SEO', desc: 'Keyword strategy, technical audits, and content optimization for organic growth.' },
      { name: 'Performance Optimization', desc: 'Speed, Core Web Vitals, and server-level tuning for peak performance.' },
      { name: 'Google & Social Media Ads', desc: 'Targeted ad campaigns across Google, Meta, and beyond.' },
      { name: 'Market & Competitor Research', desc: 'Deep-dive analysis to find gaps and opportunities in your market.' },
    ],
  },
  {
    title: 'Pillar 3: Autonomous Agency',
    services: [
      { name: 'AI-Powered Social Media', desc: 'Content creation and scheduling driven by AI agents.' },
      { name: 'n8n Workflow Automation', desc: 'Automate repetitive tasks across your entire tech stack.' },
      { name: 'Content Strategy (Vantage & Pixel)', desc: 'Our internal AI agents handle research, copywriting, and visual content.' },
    ],
  },
];

const Services = () => (
  <div className="mx-auto max-w-6xl px-6 py-16">
    <h1 className="mb-12 text-center text-4xl font-bold">Our Services</h1>

    <div className="space-y-16">
      {pillars.map((pillar) => (
        <section key={pillar.title}>
          <h2 className="mb-6 text-2xl font-semibold">{pillar.title}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pillar.services.map((svc) => (
              <Card key={svc.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{svc.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{svc.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);

export default Services;
