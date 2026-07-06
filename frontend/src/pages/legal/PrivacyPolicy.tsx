import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export function PrivacyPolicy() {
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

          <h1>Privacy Policy</h1>
          <p><strong>Last updated: July 6, 2026</strong></p>
          <p>
            RankrSEO ("we," "us," or "our") operates the website and software platform at rankrseo.com
            (the "Service"). This Privacy Policy explains what information we collect, how we use it,
            and the choices you have. By using the Service, you agree to the practices described here.
          </p>

          <h2>Information We Collect</h2>
          <p>
            <strong>Account information.</strong> When you create an account, we collect your name,
            email address, and password (stored securely through our authentication provider), along
            with basic details about your business such as its name, location, and industry.
          </p>
          <p>
            <strong>Google Business Profile data.</strong> If you choose to connect your Google
            Business Profile to RankrSEO, you authorize us — through Google's OAuth consent process —
            to access certain data from your profile, which may include your business listing
            information, reviews, posts, insights, and performance metrics. We access only the data
            needed to provide the Service, such as auditing your local search presence, generating
            reports and recommendations, and (with your authorization) publishing posts or responses
            on your behalf. You can revoke this access at any time through your Google account
            settings at{' '}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
              myaccount.google.com/permissions
            </a>{' '}
            or by disconnecting your profile within RankrSEO.
          </p>
          <p>
            <strong>Payment information.</strong> Payments are processed by Stripe, our third-party
            payment processor. We do not store your full credit card number on our servers. We retain
            records of your subscription plan and billing history.
          </p>
          <p>
            <strong>Phone numbers and SMS.</strong> If you use features that send text messages (such
            as review requests), we collect and process the phone numbers you provide for that
            purpose. Messages are sent through our SMS provider, Twilio.
          </p>
          <p>
            <strong>Usage data.</strong> We automatically collect standard technical information when
            you use the Service, such as your IP address, browser type, device information, pages
            visited, and actions taken. This helps us operate, secure, and improve the platform.
          </p>

          <h2>How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide and operate the Service</li>
            <li>Analyze and improve your business's local search presence</li>
            <li>Generate content, reports, and recommendations</li>
            <li>Publish content to your connected profiles when you direct us to</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send Service-related communications</li>
            <li>Provide customer support</li>
            <li>Maintain the security and performance of the platform</li>
          </ul>
          <p>
            We use artificial intelligence tools to analyze data and generate content within the
            Service. Data sent to AI providers for these purposes is used to deliver the requested
            features.
          </p>

          <h2>Google API Services — Limited Use Disclosure</h2>
          <p>
            RankrSEO's use and transfer of information received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We access Google user data only to provide
            user-facing features of the Service, we do not sell Google user data, and we do not use
            it for advertising purposes.
          </p>

          <h2>How We Share Information</h2>
          <p>
            We do not sell your personal information. We share information only with service providers
            who help us operate the platform — such as our hosting providers, authentication and
            database provider, payment processor (Stripe), SMS provider (Twilio), and AI service
            providers — and only as needed to deliver the Service. These providers are obligated to
            protect your information. We may also disclose information if required by law, or in
            connection with a merger, acquisition, or sale of assets (in which case this policy will
            continue to apply to your data).
          </p>

          <h2>Data Retention and Deletion</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide
            the Service. You may request deletion of your account and associated data at any time by
            emailing{' '}
            <a href="mailto:info@rankrseo.com">info@rankrseo.com</a>. When you disconnect your Google
            Business Profile, we stop accessing your Google data, and you may request deletion of
            previously retrieved Google data.
          </p>

          <h2>Data Security</h2>
          <p>
            We use reasonable administrative, technical, and physical safeguards to protect your
            information, including encryption of sensitive data. No method of transmission or storage
            is completely secure, and we cannot guarantee absolute security.
          </p>

          <h2>Your Choices</h2>
          <p>
            You can update your account information within the Service, disconnect your Google
            Business Profile at any time, opt out of non-essential communications, and request access
            to, correction of, or deletion of your personal information by contacting us at{' '}
            <a href="mailto:info@rankrseo.com">info@rankrseo.com</a>.
          </p>

          <h2>Children's Privacy</h2>
          <p>
            The Service is intended for businesses and is not directed to children under 13. We do
            not knowingly collect information from children.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The "Last updated" date above
            reflects the current version. Material changes will be communicated through the Service
            or by email.
          </p>

          <h2>Contact Us</h2>
          <p>If you have questions about this Privacy Policy or our data practices, contact us at:</p>
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
