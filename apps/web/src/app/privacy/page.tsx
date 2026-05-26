import type { Metadata } from 'next';
import { LandingPageHeader } from '@/components/landing/LandingPageHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy | Melofy',
  description: 'Learn how Melofy collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <>
      <LandingPageHeader />
      <div className='min-h-screen bg-[radial-gradient(circle_at_90%_0%,rgba(245,158,11,0.10),transparent_40%),var(--background)] text-foreground'>
        <main className='max-w-4xl mx-auto px-6 py-16 md:py-24'>
        <div className='mb-12'>
          <p className='text-xs font-bold uppercase tracking-widest text-primary mb-3'>Legal</p>
          <h1 className='text-4xl md:text-6xl font-black tracking-tighter text-foreground mb-4'>Privacy Policy</h1>
          <p className='text-muted-foreground text-lg font-light'>Last updated: March 27, 2026</p>
        </div>

        <div className='space-y-10 text-muted-foreground leading-relaxed'>
          <Section title='1. Introduction'>
            <p>
              At Melofy, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our music streaming service. Please read this policy
              carefully. If you disagree with its terms, please discontinue use of the Service.
            </p>
          </Section>

          <Section title='2. Information We Collect'>
            <p>We may collect the following types of information:</p>
            <ul className='list-disc list-inside space-y-2 mt-4 pl-2'>
              <li>
                <strong className='text-foreground/80'>Account Information:</strong> Email address, display name, and
                profile picture when you sign up or authenticate via Google.
              </li>
              <li>
                <strong className='text-foreground/80'>Usage Data:</strong> Information about your interactions with
                the Service, such as songs played, playlists created, and search queries.
              </li>
              <li>
                <strong className='text-foreground/80'>Listening History:</strong> Tracks and playlists you engage
                with, used for recommendations and personalization.
              </li>
              <li>
                <strong className='text-foreground/80'>Device Information:</strong> Browser type, operating system,
                and device identifiers for analytics and security.
              </li>
              <li>
                <strong className='text-foreground/80'>Third-Party Data:</strong> If you connect a third-party
                account (e.g., Spotify), we may receive certain data from that platform in accordance with your
                permissions.
              </li>
            </ul>
          </Section>

          <Section title='3. How We Use Your Information'>
            <p>We use the information we collect to:</p>
            <ul className='list-disc list-inside space-y-2 mt-4 pl-2'>
              <li>Provide, maintain, and improve the Service.</li>
              <li>Personalize your experience and deliver music recommendations.</li>
              <li>Communicate with you about updates, features, and support.</li>
              <li>Monitor and analyze usage and trends to improve the platform.</li>
              <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </Section>

          <Section title='4. Data Storage and Security'>
            <p>
              Your data is stored securely using Firebase (Google Cloud infrastructure). We implement
              industry-standard security measures including encrypted connections (HTTPS), access controls, and
              regular security reviews to protect your information.
            </p>
            <p className='mt-4'>
              However, no method of transmission over the internet or electronic storage is 100% secure. While we
              strive to use commercially acceptable means to protect your personal data, we cannot guarantee its
              absolute security.
            </p>
          </Section>

          <Section title='5. Data Sharing and Disclosure'>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information:</p>
            <ul className='list-disc list-inside space-y-2 mt-4 pl-2'>
              <li>With service providers who assist us in operating the platform (e.g., Firebase, Spotify API).</li>
              <li>If required by law or in response to valid legal process.</li>
              <li>To protect the rights, property, or safety of Melofy, our users, or the public.</li>
            </ul>
          </Section>

          <Section title='6. Cookies and Tracking'>
            <p>
              Melofy uses cookies and similar tracking technologies to enhance your experience, remember your
              preferences, and analyze platform usage. You can control cookie settings through your browser settings,
              though disabling cookies may affect certain features of the Service.
            </p>
          </Section>

          <Section title='7. Your Rights'>
            <p>Depending on your location, you may have the right to:</p>
            <ul className='list-disc list-inside space-y-2 mt-4 pl-2'>
              <li>Access, correct, or delete your personal data.</li>
              <li>Object to or restrict certain data processing activities.</li>
              <li>Request a portable copy of your data.</li>
              <li>Withdraw consent for data processing where consent is the legal basis.</li>
            </ul>
            <p className='mt-4'>
              To exercise any of these rights, please contact us through our{' '}
              <a href='/help' className='text-primary hover:underline'>Help Center</a>.
            </p>
          </Section>

          <Section title='8. Children&apos;s Privacy'>
            <p>
              Melofy is not directed to children under the age of 13. We do not knowingly collect personal
              information from children under 13. If you believe we have inadvertently collected such information,
              please contact us so we can promptly delete it.
            </p>
          </Section>

          <Section title='9. Changes to This Policy'>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the
              new Privacy Policy on this page and updating the &ldquo;Last updated&rdquo; date. You are advised to
              review this Privacy Policy periodically for any changes.
            </p>
          </Section>

          <Section title='10. Contact Us'>
            <p>
              If you have questions or concerns about this Privacy Policy, please visit our{' '}
              <a href='/help' className='text-primary hover:underline'>Help Center</a> or open an issue on our{' '}
              <a href='/github' className='text-primary hover:underline'>GitHub repository</a>.
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
