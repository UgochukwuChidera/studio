
"use client"; 

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, UserCircle, CreditCard, Bell, Shield, Palette, FileText, Save, KeyRound, Smartphone, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const USER_DISPLAY_NAME_KEY = 'testprep_ai_user_display_name';

export default function SettingsPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authIsLoading, user, updateUser } = useAuth();
  const router = useRouter();
  
  const [displayName, setDisplayName] = useState('');
  const [initialDisplayName, setInitialDisplayName] = useState('');

  // 2FA state (simulated)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [selected2FAMethod, setSelected2FAMethod] = useState<'app' | 'sms'>('app');


  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/auth/signin');
    } else if (user) {
      const storedDisplayName = user.displayName || localStorage.getItem(USER_DISPLAY_NAME_KEY) || user.email.split('@')[0];
      setDisplayName(storedDisplayName);
      setInitialDisplayName(storedDisplayName);
      // TODO: Load 2FA status from user profile if available
    }
  }, [authIsLoading, isAuthenticated, router, user]);

  const handleSaveDisplayName = () => {
    if (displayName.trim() === "") {
      toast({
        title: "Error",
        description: "Display name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem(USER_DISPLAY_NAME_KEY, displayName);
    if (user && updateUser) {
        updateUser({...user, displayName: displayName});
    }
    setInitialDisplayName(displayName); 
    toast({
      title: "Success",
      description: "Display name saved successfully!",
    });
    window.dispatchEvent(new StorageEvent('storage', { key: USER_DISPLAY_NAME_KEY, newValue: displayName }));
  };

  const handle2FAToggle = (checked: boolean) => {
    setIs2FAEnabled(checked);
    // In a real app, this would trigger a setup flow or API call
    toast({ title: `2FA ${checked ? 'Enabled' : 'Disabled'}`, description: `Two-factor authentication is now ${checked ? 'active' : 'inactive'} (simulated).` });
  };


  if (authIsLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 text-primary rounded-full p-4 w-fit mb-4">
              <Settings className="w-12 h-12" />
            </div>
            <CardTitle className="text-3xl font-bold text-primary">Settings</CardTitle>
            <CardDescription className="text-lg">
              Manage your account, preferences, and application settings.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <UserCircle className="w-6 h-6 text-primary" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Customize your public profile information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-base font-medium">Display Name</Label>
              <p className="text-sm text-muted-foreground">
                This name will be shown in the app and to other users if you share content.
              </p>
              <Input 
                id="displayName" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your preferred display name"
              />
            </div>
            <Button onClick={handleSaveDisplayName} disabled={displayName === initialDisplayName || displayName.trim() === ""}>
              <Save className="mr-2 h-4 w-4" /> Save Name
            </Button>
             <div className="space-y-2 pt-4">
                <Label htmlFor="profilePicture" className="text-base font-medium">Profile Picture (Coming Soon)</Label>
                 <p className="text-sm text-muted-foreground">
                    Upload an image for your profile.
                </p>
                <Input id="profilePicture" type="file" disabled />
                 <Button disabled className="mt-2">Upload Picture</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Palette className="w-6 h-6 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5 mb-4 sm:mb-0">
                <Label htmlFor="theme-toggle-button" className="text-base font-medium">Theme Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred color scheme (Light/Dark/System).
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Account Security
            </CardTitle>
            <CardDescription>
              Manage your password, two-factor authentication, and connected accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Change Password</Label>
              <Button variant="outline" disabled>Change Password (Coming Soon)</Button>
              <p className="text-sm text-muted-foreground">
                It's recommended to use a strong, unique password.
              </p>
            </div>
            <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <Label htmlFor="2fa-switch" className="text-base font-medium">Two-Factor Authentication (2FA)</Label>
                        <p className="text-sm text-muted-foreground">
                            Enhance your account security by requiring a second form of verification.
                        </p>
                    </div>
                    <Switch id="2fa-switch" checked={is2FAEnabled} onCheckedChange={handle2FAToggle} />
                </div>
                {is2FAEnabled && (
                    <div className="space-y-3 pl-2 border-l-2 border-primary ml-1">
                        <p className="text-sm text-muted-foreground">Select your preferred 2FA method (simulated):</p>
                        <Button variant={selected2FAMethod === 'app' ? 'secondary' : 'outline'} size="sm" onClick={() => setSelected2FAMethod('app')} className="w-full justify-start gap-2">
                            <Smartphone className="w-4 h-4" /> Authenticator App (Recommended)
                        </Button>
                        <Button variant={selected2FAMethod === 'sms' ? 'secondary' : 'outline'} size="sm" onClick={() => setSelected2FAMethod('sms')} className="w-full justify-start gap-2" disabled>
                            <KeyRound className="w-4 h-4" /> SMS Text Message (Coming Soon)
                        </Button>
                         <Alert variant="default">
                            <Shield className="h-4 w-4" />
                            <AlertTitle>Authenticator App Setup</AlertTitle>
                            <AlertDescription>
                                To use an authenticator app, you would typically scan a QR code with an app like Google Authenticator or Authy. This flow is currently simulated.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Connected Accounts (Coming Soon)</Label>
              <p className="text-sm text-muted-foreground">
                Manage accounts linked via Google or Apple for sign-in.
              </p>
              <div className="space-y-2">
                <Button variant="outline" disabled className="w-full justify-start gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="#4285F4" d="M21.35 11.1h-9.03v2.79h5.32c-.25 1.69-1.64 2.99-3.28 2.99-1.96 0-3.55-1.59-3.55-3.55s1.59-3.55 3.55-3.55c.89 0 1.58.32 2.15.83l2.09-2.09C17.02 6.32 15.02 5.5 12.8 5.5c-3.53 0-6.45 2.83-6.45 6.3s2.92 6.3 6.45 6.3c3.24 0 5.67-2.24 5.67-5.82 0-.53-.05-.92-.12-1.28z"></path></svg>
                  Google (Not Connected)
                </Button>
                <Button variant="outline" disabled className="w-full justify-start gap-2">
                   <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19.5 16.04C18.46 17.62 17.07 18.5 15.39 18.5c-.74 0-1.4-.14-2.12-.47-.73-.32-1.4-.51-2.22-.51-.83 0-1.5.2-2.22.51-.72.33-1.38.47-2.12.47-1.61 0-3.1-.9-4.13-2.48C.45 13.46.26 9.12 2.78 6.21c1.19-1.39 2.76-2.21 4.42-2.21.73 0 1.55.21 2.27.55.7.34 1.29.5 2.03.5s1.33-.16 2.03-.5c.72-.34 1.54-.55 2.27-.55 1.59 0 3.1.74 4.21 2.05.27.31.52.68.73 1.1.28.53.45.99.52 1.38H18.3c-.07-.29-.16-.54-.3-.75-.23-.34-.52-.59-.88-.75-.62-.27-1.24-.41-1.9-.41-.78 0-1.55.21-2.24.57-.69.35-1.23.53-1.95.53s-1.26-.18-1.95-.53C8.16 6.94 7.39 6.73 6.61 6.73c-.66 0-1.28.14-1.9.41-.36.16-.65.41-.88.75-.14.21-.23.46-.3.75h-1.1c.04-1.33.76-2.67 1.96-3.62C5.6 4.01 7.12 3.5 8.72 3.5c.75 0 1.53.2 2.26.54.71.34 1.3.51 2.02.51s1.31-.17 2.02-.51c.73-.34 1.51-.54 2.26-.54 1.69 0 3.28.56 4.36 1.7.18.19.34.38.49.57-2.15 1.29-3.4 3.65-3.4 6.37 0 1.36.41 2.56 1.24 3.61zM15.39 4.61c-.02 0-.04 0-.06 0-.76.02-1.43.28-2.12.62-.68.34-1.17.51-1.71.51s-1.03-.17-1.71-.51c-.69-.34-1.36-.6-2.12-.62-.02 0-.04 0-.06 0C6.08 4.61 4.9 5.21 4.1 6.21c-1.1 1.42-1.29 3.42-.79 5.31.56 2.15 1.96 3.62 3.75 3.62.74 0 1.39-.2 2.12-.51.73-.31 1.4-.47 2.12-.47s1.39.16 2.12.47c.73.31 1.38.51 2.12.51 1.79 0 3.19-1.47 3.75-3.62.5-1.89.31-3.89-.79-5.31C17.87 5.22 16.7 4.61 15.39 4.61z"></path></svg>
                  Apple (Not Connected)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-primary" /> 
                Billing &amp; Subscription (Coming Soon)
            </CardTitle>
            <CardDescription>
                Manage your subscription plan, payment methods, and view invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center text-muted-foreground py-6">
              <p className="max-w-md mx-auto text-center">
                This section will soon allow you to:
              </p>
              <ul className="list-disc list-inside mt-4 text-left text-muted-foreground space-y-2 max-w-md mx-auto">
                <li>Upgrade or downgrade your subscription (Free, Basic, Pro)</li>
                <li>Update payment methods (Flutterwave, Stripe)</li>
                <li>View billing history and download invoices</li>
                <li>
                  <span className="font-medium text-foreground flex items-center"><FileText className="w-4 h-4 mr-2 text-primary" /> Review cookie consent preferences</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

