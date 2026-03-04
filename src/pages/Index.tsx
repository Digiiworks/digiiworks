import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const pillars = [
  {
    title: 'Digital Architecture',
    description: 'Custom Web Development, Responsive Design, UX/UI Design, CMS Integration, and our Rent-A-Website model.',
  },
  {
    title: 'Growth Engine',
    description: 'Data-Driven SEO, Performance Optimization, Google & Social Media Ads, and Market/Competitor Research.',
  },
  {
    title: 'Autonomous Agency',
    description: 'AI-Powered Social Media, n8n Workflow Automation, and Content Strategy powered by Vantage & Pixel.',
  },
];

const Index = () => (
  <div className="mx-auto max-w-6xl px-6 py-16">
    <div className="mb-16 text-center">
      <h1 className="mb-4 text-4xl font-bold">Digiiworks</h1>
      <p className="text-lg text-muted-foreground">
        Three pillars. One agency. Everything your brand needs to grow online.
      </p>
    </div>

    <div className="grid gap-8 md:grid-cols-3">
      {pillars.map((pillar) => (
        <Card key={pillar.title}>
          <CardHeader>
            <CardTitle>{pillar.title}</CardTitle>
            <CardDescription>{pillar.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>

    <div className="mt-12 flex justify-center gap-4">
      <Button asChild>
        <Link to="/services">Explore Services</Link>
      </Button>
      <Button variant="outline" asChild>
        <Link to="/contact">Get in Touch</Link>
      </Button>
    </div>
  </div>
);

export default Index;
