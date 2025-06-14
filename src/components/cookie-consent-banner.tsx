
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'testprep_ai_cookie_consent_v1'; // Added versioning

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // This effect runs only on the client-side after hydration
    const consentGiven = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consentGiven) { // Only show if no decision has been made (null or undefined)
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setIsVisible(false);
    // Future: Implement logic to disable non-essential cookies or features
    // For now, simply hides the banner.
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 flex justify-center">
        <Card className="w-full max-w-xl shadow-2xl border-border bg-background/95 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                <Cookie className="w-5 h-5 text-primary" /> We Value Your Privacy
                </CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className="text-sm text-foreground/90">
                We use cookies to enhance your experience, analyze site traffic, and personalize content. By clicking "Accept All", you consent to our use of cookies. You can change your preferences at any time in settings.
                </CardDescription>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button variant="outline" onClick={handleDecline} className="w-full sm:w-auto">Decline</Button>
                <Button onClick={handleAccept} className="w-full sm:w-auto">Accept All</Button>
            </CardFooter>
        </Card>
    </div>
  );
}
