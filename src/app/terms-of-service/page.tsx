
// src/app/terms-of-service/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - TestPrep AI',
  description: 'Read the TestPrep AI Terms of Service.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
       <header className="py-6 px-4 sm:px-8 flex justify-center items-center border-b mb-8">
          <h1 className="text-3xl font-bold text-primary">TestPrep AI</h1>
      </header>
      <main className="container mx-auto max-w-3xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-3">
              <FileText className="w-10 h-10" />
            </div>
            <CardTitle className="text-2xl font-bold">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

            <p>
              Please read these Terms of Service (&quot;Terms&quot;, &quot;Terms of Service&quot;) carefully before using the TestPrep AI application (the &quot;Service&quot;) operated by TestPrep AI (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;).
            </p>
            <p>
              Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
            <p>
              By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
            </p>

            <h2 className="text-xl font-semibold">1. Accounts</h2>
            <p>
              When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
            <p>
              You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.
            </p>
            <p>
              You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
            </p>

            <h2 className="text-xl font-semibold">2. User Content</h2>
            <p>
              Our Service allows you to upload, link, store, share and otherwise make available certain information, text, graphics, videos, or other material (&quot;Content&quot;). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.
            </p>
            <p>
              By posting Content to the Service, you grant us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such Content on and through the Service for the purpose of operating and providing the Service. You retain any and all of your rights to any Content you submit, post or display on or through the Service and you are responsible for protecting those rights.
            </p>
            <p>
                You represent and warrant that: (i) the Content is yours (you own it) or you have the right to use it and grant us the rights and license as provided in these Terms, and (ii) the posting of your Content on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person.
            </p>
             <p>
                We reserve the right to remove Content that is deemed abusive, defamatory, obscene, fraudulent, or in violation of any intellectual property right or these Terms.
            </p>

            <h2 className="text-xl font-semibold">3. AI Generated Content</h2>
             <p>
                The Service uses artificial intelligence (AI) to generate tests, flashcards, and notes (&quot;AI Generated Content&quot;). While we strive for accuracy, AI Generated Content may contain errors or inaccuracies. You agree to review and verify AI Generated Content before relying on it for critical study purposes. We are not liable for any inaccuracies in AI Generated Content.
            </p>
            <p>
                You are responsible for ensuring that the input materials you provide for AI generation do not infringe on any third-party rights.
            </p>

            <h2 className="text-xl font-semibold">4. Subscriptions and Payments</h2>
            <p>
              Some parts of the Service are billed on a subscription basis (&quot;Subscription(s)&quot;). You will be billed in advance on a recurring and periodic basis (&quot;Billing Cycle&quot;). Billing cycles are set either on a monthly or annual basis, depending on the type of subscription plan you select when purchasing a Subscription.
            </p>
            <p>
              At the end of each Billing Cycle, your Subscription will automatically renew under the exact same conditions unless you cancel it or TestPrep AI cancels it. You may cancel your Subscription renewal either through your online account management page or by contacting TestPrep AI customer support.
            </p>
            <p>
              A valid payment method is required to process the payment for your Subscription. We use third-party payment processors (e.g., Flutterwave, Stripe) to handle payments.
            </p>

            <h2 className="text-xl font-semibold">5. Intellectual Property</h2>
            <p>
              The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of TestPrep AI and its licensors. The Service is protected by copyright, trademark, and other laws of both the [Your Country] and foreign countries.
            </p>

            <h2 className="text-xl font-semibold">6. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
            <p>
              Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or contact us.
            </p>

            <h2 className="text-xl font-semibold">7. Limitation Of Liability</h2>
            <p>
              In no event shall TestPrep AI, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.
            </p>

            <h2 className="text-xl font-semibold">8. Disclaimer</h2>
            <p>
              Your use of the Service is at your sole risk. The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
            </p>

            <h2 className="text-xl font-semibold">9. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction, e.g., Nigeria], without regard to its conflict of law provisions.
            </p>

            <h2 className="text-xl font-semibold">10. Changes</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>

            <h2 className="text-xl font-semibold">11. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at: legal@testprep.ai (example email).
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
