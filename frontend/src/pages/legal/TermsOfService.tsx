import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2 text-gray-900 hover:text-brand-600 transition-colors">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold">RankrSEO</span>
          </Link>
          <Link to="/login" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Sign in →</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 prose prose-gray max-w-none
          prose-headings:font-bold prose-headings:text-gray-900
          prose-h1:text-3xl prose-h1:mb-2
          prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3
          prose-p:text-gray-600 prose-p:leading-relaxed
          prose-li:text-gray-600
          prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-800">

          <h1>Terms of Service</h1>
          <p><strong>Last updated: July 6, 2026</strong></p>
          <p>
            These Terms of Service ("Terms") govern your use of the RankrSEO website and software
            platform at rankrseo.com (the "Service"), operated by RankrSEO ("we," "us," or "our").
            By creating an account or using the Service, you agree to these Terms. If you do not
            agree, do not use the Service.
          </p>

          <h2>1. The Service</h2>
          <p>
            RankrSEO is a software platform that helps local businesses analyze and improve their
            online search presence. Features include local SEO auditing, Google Business Profile
            analysis and management, AI-generated content, review management tools, keyword and
            competitor tracking, and related reporting.
          </p>

          <h2>2. Accounts</h2>
          <p>
            You must provide accurate information when creating an account and keep your login
            credentials secure. You are responsible for all activity under your account. You must be
            at least 18 years old and using the Service on behalf of a business.
          </p>

          <h2>3. Connecting Third-Party Accounts</h2>
          <p>
            The Service allows you to connect third-party accounts, including your Google Business
            Profile via Google's OAuth consent process. By connecting an account, you represent that
            you own or are authorized to manage that account and its business listing. You may
            disconnect a linked account at any time. Your use of Google services through RankrSEO is
            also subject to Google's own terms and policies.
          </p>
          <p>
            When you direct the Service to publish content (such as posts or review responses) to
            your connected profiles, you authorize us to do so on your behalf and you remain
            responsible for that content.
          </p>

          <h2>4. Subscriptions and Billing</h2>
          <p>
            The Service is offered on paid subscription plans, billed through our payment processor,
            Stripe. Fees are billed in advance on a recurring basis according to your selected plan.
            You may cancel at any time, and cancellation takes effect at the end of the current
            billing period. Except where required by law, payments are non-refundable. We may change
            pricing with reasonable advance notice; continued use after a price change takes effect
            constitutes acceptance.
          </p>

          <h2>5. AI-Generated Content</h2>
          <p>
            The Service uses artificial intelligence to generate content, analysis, and
            recommendations. AI output may contain inaccuracies. You are responsible for reviewing
            content before publishing it and for ensuring anything you publish complies with
            applicable laws and platform policies (including Google's content policies). We do not
            guarantee specific search rankings, visibility improvements, or business outcomes.
          </p>

          <h2>6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Connect or manage profiles you are not authorized to manage</li>
            <li>Use the Service to publish false, misleading, or deceptive content, including fake reviews</li>
            <li>Attempt to interfere with, disrupt, or gain unauthorized access to the Service or its systems</li>
            <li>Resell or provide access to the Service to third parties without our permission</li>
            <li>Use automated means to scrape or extract data from the Service</li>
          </ul>
          <p>We may suspend or terminate accounts that violate these Terms.</p>

          <h2>7. Your Content and Data</h2>
          <p>
            You retain ownership of the content and data you provide to the Service and the business
            data retrieved from your connected accounts. You grant us a limited license to use that
            content and data solely to operate and provide the Service to you. Our handling of
            personal information is described in our{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <h2>8. Our Intellectual Property</h2>
          <p>
            The Service, including its software, design, and branding, is owned by RankrSEO and
            protected by intellectual property laws. These Terms do not grant you any rights to our
            intellectual property except the limited right to use the Service as intended.
          </p>

          <h2>9. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
            UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT IT WILL ACHIEVE ANY PARTICULAR RESULTS
            FOR YOUR BUSINESS.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, RANKRSEO WILL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
            REVENUE, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY
            FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICE WILL NOT EXCEED THE AMOUNT YOU
            PAID US IN THE TWELVE (12) MONTHS BEFORE THE CLAIM AROSE.
          </p>

          <h2>11. Termination</h2>
          <p>
            You may stop using the Service and cancel your account at any time. We may suspend or
            terminate your access for violation of these Terms or if required for legal or security
            reasons. Upon termination, your right to use the Service ends, and we may delete your
            data in accordance with our Privacy Policy.
          </p>

          <h2>12. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. The "Last updated" date reflects the
            current version. Material changes will be communicated through the Service or by email.
            Continued use after changes take effect constitutes acceptance.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Texas, without regard to
            conflict-of-law principles. Any disputes will be resolved in the state or federal courts
            located in Texas.
          </p>

          <h2>14. Contact</h2>
          <p>Questions about these Terms? Contact us at:</p>
          <p>
            <strong>RankrSEO</strong><br />
            Email: <a href="mailto:info@rankrseo.com">info@rankrseo.com</a><br />
            Website: <a href="https://rankrseo.com">rankrseo.com</a>
          </p>
        </div>
      </main>

      <footer className="max-w-3xl mx-auto px-6 pb-12 flex gap-6 text-sm text-gray-400">
        <Link to="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-gray-600">Terms of Service</Link>
        <Link to="/login" className="hover:text-gray-600">Sign in</Link>
      </footer>
    </div>
  );
}
