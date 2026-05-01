import type { Metadata } from 'next';
import { LandingPageHeader } from '@/components/landing/LandingPageHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Terms of Service | Melofy',
  description: 'Read the Terms of Service for Melofy, the ultimate destination for music lovers.',
};

export default function TermsPage() {
  return (
    <>
      <LandingPageHeader />
      <div className='min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(6,182,212,0.10),transparent_40%),var(--background)] text-foreground'>
        <main className='max-w-4xl mx-auto px-6 py-16 md:py-24'>
        <div className='mb-12'>
          <p className='text-xs font-bold uppercase tracking-widest text-primary mb-3'>Legal</p>
          <h1 className='text-4xl md:text-6xl font-black tracking-tighter text-foreground mb-4'>Terms of Service</h1>
          <p className='text-muted-foreground text-lg font-light'>Last updated: March 27, 2026</p>
        </div>

        <div className='space-y-10 text-muted-foreground leading-relaxed'>
          <Section title='1. Acceptance of Terms'>
            <p>
              By accessing or using Melofy (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use the Service. These Terms apply to all
              visitors, users, and others who access the Service.
            </p>
          </Section>

          <Section title='2. Description of Service'>
            <p>
              Melofy is a music streaming and discovery platform that allows users to listen to music, create
              playlists, import playlists from third-party services like Spotify, and discover new artists and tracks.
              The Service is provided &ldquo;as is&rdquo; and is subject to change without notice.
            </p>
          </Section>

          <Section title='3. User Accounts'>
            <p>
              To access certain features of Melofy, you must create an account. You are responsible for maintaining
              the confidentiality of your account credentials and for all activities that occur under your account.
              You agree to notify us immediately of any unauthorized use of your account.
            </p>
            <ul className='list-disc list-inside space-y-2 mt-4 pl-2'>
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You must be at least 13 years of age to use the Service.</li>
              <li>You may not share your account with others or transfer your account to another person.</li>
              <li>You are solely responsible for any activity that occurs on your account.</li>
            </ul>
          </Section>

          <Section title='4. Content and Intellectual Property'>
            <p>
              The music, artwork, and other content available through Melofy are owned by their respective rights
              holders. You are granted a limited, non-exclusive, non-transferable license to stream and listen to
              this content for your personal, non-commercial use only.
            </p>
            <p className='mt-4'>
              You may not reproduce, distribute, modify, publicly display, or create derivative works of any content
              from the Service without explicit written permission from the rights holder.
            </p>
          </Section>

          <Section title='5. User Conduct'>
            <p>You agree not to:</p>
            <ul className='list-disc list-inside space-y-2 mt-4 pl-2'>
              <li>Use the Service for any unlawful purpose or in violation of these Terms.</li>
              <li>Attempt to gain unauthorized access to any part of the Service or its systems.</li>
              <li>Transmit any harmful, offensive, or disruptive content through the Service.</li>
              <li>Use automated tools (bots, scrapers) to access the Service without permission.</li>
              <li>Circumvent, disable, or otherwise interfere with security-related features of the Service.</li>
            </ul>
          </Section>

          <Section title='6. Third-Party Services'>
            <p>
              Melofy may integrate with or link to third-party services such as Spotify. Your use of those
              third-party services is governed by their respective terms of service and privacy policies. Melofy is
              not responsible for the content, practices, or policies of any third-party service.
            </p>
          </Section>

          <Section title='7. Disclaimer of Warranties'>
            <p>
              The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without any
              warranty of any kind, either express or implied. We do not warrant that the Service will be
              uninterrupted, error-free, or free of viruses or other harmful components.
            </p>
          </Section>

          <Section title='8. Limitation of Liability'>
            <p>
              To the maximum extent permitted by applicable law, Melofy and its affiliates shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages arising out of or related to
              your use of the Service, even if we have been advised of the possibility of such damages.
            </p>
          </Section>

          <Section title='9. Changes to Terms'>
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of significant changes
              by updating the &ldquo;Last updated&rdquo; date at the top of this page. Your continued use of the
              Service after any changes constitutes your acceptance of the new Terms.
            </p>
          </Section>

          <Section title='10. Contact Us'>
            <p>
              If you have any questions about these Terms of Service, please reach out to us via our{' '}
              <a href='/help' className='text-primary hover:underline'>
                Help Center
              </a>{' '}
              or through our{' '}
              <a href='/github' className='text-primary hover:underline'>
                GitHub repository
              </a>
              .
            </p>
          </Section>
        </div>
      </main>

      <LandingFooter />
    </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='space-y-3'>
      <h2 className='text-lg font-bold text-foreground tracking-tight'>{title}</h2>
      <div className='text-muted-foreground/80 text-sm leading-7 space-y-3'>{children}</div>
    </section>
  );
}
