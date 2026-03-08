const Privacy = () => (
  <div className="relative min-h-screen">
    <div className="absolute inset-0 grid-overlay opacity-20" />
    <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <p className="font-mono text-xs uppercase tracking-widest mb-3 text-muted-foreground">// legal</p>
        <h1 className="font-mono text-3xl font-bold md:text-4xl">
          <span className="text-gradient">Privacy Policy</span>
        </h1>
        <p className="mt-3 font-mono text-xs text-muted-foreground">Last updated: March 2026</p>
      </div>

      <div className="glass-card p-6 md:p-10 space-y-8">
        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">1. Information We Collect</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We collect information you provide directly, including your name, email address, and message when you use our contact form. We also collect usage data automatically through cookies and analytics tools.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We use collected information to respond to inquiries, improve our services, send relevant communications (with your consent), and ensure the security of our platform.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">3. Data Storage & Security</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your data is stored securely using industry-standard encryption. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">4. Third-Party Services</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We may use third-party services for analytics, hosting, and communication. These providers have their own privacy policies governing the use of your information.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">5. Your Rights</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at hello@digiiworks.co.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">6. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            For questions about this policy, email us at hello@digiiworks.co.
          </p>
        </section>
      </div>
    </div>
  </div>
);

export default Privacy;
