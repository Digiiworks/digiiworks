const Terms = () => (
  <div className="relative min-h-screen">
    <div className="absolute inset-0 grid-overlay opacity-20" />
    <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <p className="font-mono text-xs uppercase tracking-widest mb-3 text-muted-foreground">// legal</p>
        <h1 className="font-mono text-3xl font-bold md:text-4xl">
          <span className="text-gradient">Terms of Service</span>
        </h1>
        <p className="mt-3 font-mono text-xs text-muted-foreground">Last updated: March 2026</p>
      </div>

      <div className="glass-card p-6 md:p-10 space-y-8">
        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            By accessing and using the Digiiworks website and services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">2. Services</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Digiiworks provides custom web development, AI-powered automation, SEO, and workflow engineering services. Specific deliverables, timelines, and pricing are agreed upon per project.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">3. Intellectual Property</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            All content, designs, code, and materials produced by Digiiworks remain our intellectual property until full payment is received, at which point ownership transfers to the client as specified in the project agreement.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">4. Payment Terms</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Payment terms are defined per project. Late payments may result in project suspension. All fees are non-refundable unless otherwise stated in writing.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">5. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Digiiworks shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services. Our total liability is limited to the amount paid for the specific service.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">6. Termination</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Either party may terminate a service agreement with 30 days written notice. Upon termination, all completed work and associated fees remain due.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg font-semibold text-foreground mb-3">7. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            For questions about these terms, email us at hello@digiiworks.co.
          </p>
        </section>
      </div>
    </div>
  </div>
);

export default Terms;
