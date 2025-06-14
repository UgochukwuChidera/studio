
// src/app/privacy-policy/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - TestPrep AI',
  description: 'Read the TestPrep AI Privacy Policy.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <header className="py-6 px-4 sm:px-8 flex justify-center items-center border-b mb-8">
          <h1 className="text-3xl font-bold text-primary">TestPrep AI</h1>
      </header>
      <main className="container mx-auto max-w-3xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-3">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <CardTitle className="text-2xl font-bold">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

            <p>
              Welcome to TestPrep AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            </p>

            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p>
              We may collect personal information that you provide to us directly, such as when you create an account, use our services, or communicate with us. This may include:
            </p>
            <ul>
              <li>Account Information: Name, email address, password.</li>
              <li>User Content: Study materials you upload, tests you generate, notes, and flashcards.</li>
              <li>Usage Data: Information about how you use TestPrep AI, such as features accessed and time spent.</li>
              <li>Device Information: IP address, browser type, operating system (collected automatically).</li>
            </ul>

            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, operate, and maintain TestPrep AI.</li>
              <li>Improve, personalize, and expand our services.</li>
              <li>Understand and analyze how you use our application.</li>
              <li>Develop new products, services, features, and functionality.</li>
              <li>Communicate with you, including for customer service and updates.</li>
              <li>Process your transactions (if applicable for premium services).</li>
              <li>Prevent fraud and ensure security.</li>
            </ul>

            <h2 className="text-xl font-semibold">3. How We Share Your Information</h2>
            <p>
              We do not sell your personal information. We may share your information in the following limited circumstances:
            </p>
            <ul>
              <li>With Service Providers: To perform tasks on our behalf (e.g., payment processing, data analytics, AI model providers like Google for Genkit). These providers are obligated to protect your data.</li>
              <li>For Legal Reasons: If required by law or in response to valid requests by public authorities.</li>
              <li>To Protect Rights: To protect our rights, privacy, safety, or property, and/or that of our users or others.</li>
            </ul>

            <h2 className="text-xl font-semibold">4. Data Security</h2>
            <p>
              We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that no security measures are perfect or impenetrable.
            </p>
            
            <h2 className="text-xl font-semibold">5. Cookie Policy</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our Service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
            </p>
            <p>
              We use essential cookies for basic site functionality and analytics cookies (e.g., Google Analytics, if used) to understand how our service is used. Our cookie consent banner allows you to manage your preferences for non-essential cookies.
            </p>


            <h2 className="text-xl font-semibold">6. Your Data Rights (GDPR & Others)</h2>
            <p>
              Depending on your location, you may have certain rights regarding your personal information, such as the right to access, correct, delete, or restrict its processing. Please contact us to exercise these rights.
            </p>

            <h2 className="text-xl font-semibold">7. Children&apos;s Privacy</h2>
            <p>
              Our service is not intended for use by children under the age of 13 (or a higher age if stipulated by local law). We do not knowingly collect personally identifiable information from children under this age.
            </p>

            <h2 className="text-xl font-semibold">8. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-xl font-semibold">9. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at: privacy@testprep.ai (example email).
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
