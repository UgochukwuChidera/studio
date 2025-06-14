
"use client";

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, isLocalStorageAvailable } from '@/lib/supabaseClient'; // Corrected import path
import { type User as SupabaseUser, type Session as SupabaseSession, AuthError, Provider, AuthApiError } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const USER_DISPLAY_NAME_KEY = 'testprep_ai_user_display_name_supabase_v1';

export interface AppUser {
  id: string;
  email: string | undefined;
  displayName: string | null;
  subscriptionTier: "free" | "basic" | "pro";
  // Add other app-specific user properties here if needed
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AppUser | null;
  session: SupabaseSession | null;
  isLoading: boolean;
  loginUserWithEmail: (email: string, password: string) => Promise<{ user: AppUser | null; error: AuthError | null }>;
  registerUserWithEmail: (email: string, password: string, displayName?: string) => Promise<{ user: AppUser | null; error: AuthError | null; requiresConfirmation?: boolean }>;
  logoutUser: () => Promise<{ error: AuthError | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  updateUser: (updatedUserData: Partial<AppUser>) => void;
  loginWithGoogle: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const router = useRouter();
  const isLoadingRef = useRef(isLoading); // To get latest isLoading state in timeouts

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    console.log("AuthContext (Supabase): Setting up auth state listener.");
    setIsLoading(true);

    if (typeof window !== 'undefined' && !isLocalStorageAvailable()) {
      console.warn("AuthContext (Supabase): localStorage is not available. Session persistence might be affected. This can happen in private browsing modes or if cookies/storage are disabled.");
      toast({
        title: "Storage Issue",
        description: "Your browser's storage seems to be disabled or in private mode. This might affect your session. Please enable cookies/storage for the best experience.",
        variant: "destructive",
        duration: 10000,
      });
    }

    // Initial session check
    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSessionData }, error: initialSessionError } = await supabase.auth.getSession();
        
        if (initialSessionError instanceof AuthApiError && initialSessionError.message.toLowerCase().includes('invalid refresh token')) {
          console.warn("AuthContext (Supabase): Invalid refresh token found during initial session check. Signing out to clear state.");
          await supabase.auth.signOut(); // Clear Supabase's internal state too
          setAppUser(null);
          setSession(null);
          localStorage.removeItem(USER_DISPLAY_NAME_KEY);
          // isLoading will be set to false in the finally block of onAuthStateChange or timeout
        } else if (initialSessionError) {
          console.error("AuthContext (Supabase): Error fetching initial session:", initialSessionError.message);
          // Don't necessarily sign out, could be a temp network issue. onAuthStateChange will be the source of truth.
        } else if (initialSessionData) {
          console.log("AuthContext (Supabase): Initial session found via getSession(). Waiting for onAuthStateChange to confirm/update.");
          // We still wait for onAuthStateChange to be the primary driver for setting user state
        } else {
          console.log("AuthContext (Supabase): No initial session found via getSession().");
          setAppUser(null);
          setSession(null);
          localStorage.removeItem(USER_DISPLAY_NAME_KEY);
        }
      } catch (e) {
        console.error("AuthContext (Supabase): Exception during initial session check:", e);
      }
      // isLoading should primarily be managed by onAuthStateChange or the timeout.
    };

    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        console.log(
          `AuthContext (Supabase): onAuthStateChange event: ${_event}`,
          "session:",
          currentSession ? "exists" : "null"
        );
        setSession(currentSession);
        const supabaseUser = currentSession?.user;

        if (supabaseUser) {
          console.log(
            `AuthContext (Supabase): Supabase user found (event: ${_event}). ID: ${supabaseUser.id}. Attempting to fetch profile...`
          );
          try {
            console.log("AuthContext (Supabase): PRE-PROFILE FETCH - About to query 'users' table.");
            const { data: userProfile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', supabaseUser.id)
              .single();

            console.log("AuthContext (Supabase): POST-PROFILE FETCH - Query completed.");
            if (profileError) {
              console.log("AuthContext (Supabase): POST-PROFILE FETCH - Profile error object:", JSON.stringify(profileError));
              if (profileError.code === 'PGRST116') { // "No rows found"
                console.warn(
                  `AuthContext (Supabase): User profile not found in 'users' table for UID: ${supabaseUser.id}. This can happen if the 'handle_new_user' trigger hasn't run or failed. Defaulting user data.`
                );
                const defaultAppUser: AppUser = {
                  id: supabaseUser.id,
                  email: supabaseUser.email,
                  displayName: supabaseUser.user_metadata?.display_name || localStorage.getItem(USER_DISPLAY_NAME_KEY) || supabaseUser.email?.split('@')[0] || "User",
                  subscriptionTier: "free",
                };
                setAppUser(defaultAppUser);
                if (defaultAppUser.displayName && defaultAppUser.displayName !== localStorage.getItem(USER_DISPLAY_NAME_KEY)) {
                  localStorage.setItem(USER_DISPLAY_NAME_KEY, defaultAppUser.displayName);
                }
              } else {
                console.error("AuthContext (Supabase): Error fetching user profile. Full error object:", JSON.stringify(profileError, null, 2));
                console.error("AuthContext (Supabase): Error fetching user profile. Message:", profileError.message, "Code:", profileError.code, "Details:", profileError.details, "Hint:", profileError.hint);
                let toastDescription = `Could not fetch your user profile: ${profileError.message || 'Unknown error'}.`;
                if (profileError.message?.toLowerCase().includes('failed to fetch')) {
                    toastDescription = "Network error: Could not fetch profile. Check Supabase URL and network connection.";
                } else if (profileError.code === '42501') { // permission denied for schema public
                    toastDescription = "Database permission error. Please check RLS and grants on 'public.users' table.";
                }
                toast({ title: "Profile Error", description: toastDescription, variant: "destructive", duration: 8000 });
                // Fallback to basic user info if profile fetch fails but auth user exists
                setAppUser({
                  id: supabaseUser.id,
                  email: supabaseUser.email,
                  displayName: supabaseUser.user_metadata?.display_name || localStorage.getItem(USER_DISPLAY_NAME_KEY) || supabaseUser.email?.split('@')[0] || "User",
                  subscriptionTier: "free",
                });
              }
            } else if (userProfile) {
              console.log("AuthContext (Supabase): POST-PROFILE FETCH - User profile fetched successfully:", userProfile);
              const currentAppUser: AppUser = {
                id: supabaseUser.id,
                email: supabaseUser.email,
                displayName: userProfile.display_name || supabaseUser.user_metadata?.display_name || localStorage.getItem(USER_DISPLAY_NAME_KEY) || supabaseUser.email?.split('@')[0] || "User",
                subscriptionTier: userProfile.subscription_tier || "free",
              };
              setAppUser(currentAppUser);
              if (currentAppUser.displayName && currentAppUser.displayName !== localStorage.getItem(USER_DISPLAY_NAME_KEY)) {
                localStorage.setItem(USER_DISPLAY_NAME_KEY, currentAppUser.displayName);
              }
            } else {
               console.warn(`AuthContext (Supabase): POST-PROFILE FETCH - User profile query returned no error AND no data for UID: ${supabaseUser.id}. Defaulting user data.`);
               const defaultAppUser: AppUser = {
                  id: supabaseUser.id,
                  email: supabaseUser.email,
                  displayName: supabaseUser.user_metadata?.display_name || localStorage.getItem(USER_DISPLAY_NAME_KEY) || supabaseUser.email?.split('@')[0] || "User",
                  subscriptionTier: "free",
                };
                setAppUser(defaultAppUser);
            }
          } catch (error: any) {
            console.error(
              "AuthContext (Supabase): CATCH BLOCK - Error during profile fetch process:",
              error.message, error
            );
            toast({ title: "Profile Fetch Exception", description: `An unexpected error occurred while fetching your profile: ${error.message}`, variant: "destructive" });
             setAppUser({ // Fallback even in catch
                id: supabaseUser.id,
                email: supabaseUser.email,
                displayName: supabaseUser.user_metadata?.display_name || localStorage.getItem(USER_DISPLAY_NAME_KEY) || supabaseUser.email?.split('@')[0] || "User",
                subscriptionTier: "free",
            });
          } finally {
            console.log("AuthContext (Supabase): FINALLY BLOCK (profile fetch) - Setting isLoading to false from onAuthStateChange.");
            setIsLoading(false);
          }
        } else { // No supabaseUser from onAuthStateChange (e.g., SIGNED_OUT, or initial state before session resolved)
          console.log(
            "AuthContext (Supabase): No active session or user from onAuthStateChange. Clearing appUser."
          );
          setAppUser(null);
          setSession(null);
          localStorage.removeItem(USER_DISPLAY_NAME_KEY);
          setIsLoading(false);
        }
      }
    );

    // Fallback timeout if all else fails to set isLoading to false
    const loadingTimeout = setTimeout(() => {
      if (isLoadingRef.current) {
        console.warn(
          "AuthContext (Supabase): Forcing isLoading to false after timeout (7s). This might indicate an issue with Supabase auth listeners or initial session retrieval in this environment."
        );
        setIsLoading(false);
      }
    }, 7000); // 7 seconds

    return () => {
      console.log(
        "AuthContext (Supabase): Cleaning up onAuthStateChange listener and loading timeout."
      );
      authListener?.subscription?.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, [toast]); // toast is stable

  const loginUserWithEmail = async (email: string, password: string) => {
    console.log("AuthContext (Supabase): Attempting login for email:", email);
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // isLoading will be set to false by onAuthStateChange listener or timeout

    if (error) {
      console.error("AuthContext (Supabase): Supabase login error:", error.message, "Full error:", JSON.stringify(error, null, 2));
      let description = error.message || "Invalid email or password.";
       if (error.message.toLowerCase().includes("email not confirmed")) {
        description = "Your email address has not been confirmed. Please check your inbox for a confirmation link.";
      } else if (error.code === 'invalid_credentials' || (error.message && error.message.toLowerCase().includes("invalid login credentials")) ) {
        description = "Invalid email or password. Please try again.";
      }
      toast({ title: "Sign In Failed", description, variant: "destructive" });
      setIsLoading(false); // Ensure loading is false on direct error from signIn
      return { user: null, error };
    }
    // onAuthStateChange will handle successful login state update
    // toast({ title: "Signed In", description: "Welcome back!"}); // Usually handled by redirect or dashboard greeting
    return { user: appUser, error: null }; // appUser might be stale here, onAuthStateChange is source of truth
  };

  const registerUserWithEmail = async (email: string, password: string, displayNameInput?: string) => {
    console.log("AuthContext (Supabase): Attempting registration for email:", email);
    setIsLoading(true);
    const displayName = displayNameInput?.trim() || email.split('@')[0] || "New User";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      }
    });
    // isLoading will be set to false by onAuthStateChange listener or timeout

    let requiresConfirmation = false;

    if (error) {
      console.error("AuthContext (Supabase): Supabase registration error:", error.message);
      toast({ title: "Sign Up Failed", description: error.message || "Could not create account.", variant: "destructive" });
      setIsLoading(false); // Ensure loading is false on direct error
      return { user: null, error, requiresConfirmation };
    }

    if (data.user && data.user.identities?.length === 0) { // Common indicator for email confirmation needed
      requiresConfirmation = true;
      console.log("AuthContext (Supabase): Registration requires email confirmation for:", email);
      toast({ title: "Account Created!", description: "Please check your email to confirm your account before signing in." });
    } else if (data.user && data.session) {
      console.log("AuthContext (Supabase): Registration successful and user signed in:", data.user.id);
      // onAuthStateChange will handle appUser update
      toast({ title: "Account Created!", description: "You are now signed in." });
    } else if (data.user) {
       console.log("AuthContext (Supabase): Registration resulted in user creation, session state pending:", data.user.id);
       toast({ title: "Account Created!", description: "Please check your email or try signing in." });
       // If email confirmation is off, onAuthStateChange should fire with SIGNED_IN
    } else {
      console.warn("AuthContext (Supabase): Registration response did not contain user but no error reported.");
      toast({ title: "Sign Up Attempted", description: "Please check your email or try signing in." });
    }
    if (!data.session) setIsLoading(false); // If no session immediately, stop loading from this path
    return { user: appUser, error: null, requiresConfirmation }; // appUser might be stale
  };

  const logoutUser = async () => {
    console.log("AuthContext (Supabase): Attempting logout.");
    setIsLoading(true); // Indicate loading state during logout
    const { error } = await supabase.auth.signOut();
    
    // Proactively clear client-side state, onAuthStateChange will confirm
    setAppUser(null);
    setSession(null);
    localStorage.removeItem(USER_DISPLAY_NAME_KEY);
    setIsLoading(false); // Set loading false after sign out attempt

    if (error) {
      console.error("AuthContext (Supabase): Supabase logout error:", error.message);
      toast({ title: "Logout Failed", description: error.message || "Could not sign out.", variant: "destructive" });
    } else {
      console.log("AuthContext (Supabase): Logout successful from client perspective.");
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      // router.push('/auth/signin'); // AppLayout will handle this redirect
    }
    return { error };
  };

  const sendPasswordReset = async (email: string) => {
    console.log("AuthContext (Supabase): Attempting to send password reset for email:", email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // redirectTo is handled by Supabase dashboard "Site URL" + Email Templates
    });
    if (error) {
      console.error("AuthContext (Supabase): Supabase password reset error:", error.message);
      toast({ title: "Password Reset Failed", description: error.message || "Could not send reset email.", variant: "destructive" });
    } else {
      toast({ title: "Password Reset Email Sent", description: "If an account exists for this email, a password reset link has been sent. Please check your inbox." });
    }
    return { error };
  };

  const updateUser = async (updatedUserData: Partial<AppUser>) => {
    if (appUser && session) {
      const newAppUser = { ...appUser, ...updatedUserData };
      
      if (updatedUserData.displayName && updatedUserData.displayName !== appUser.displayName) {
        setAppUser(newAppUser); // Optimistic UI update for display name
        localStorage.setItem(USER_DISPLAY_NAME_KEY, updatedUserData.displayName);
        try {
          const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            data: { display_name: updatedUserData.displayName }
          });

          if (updateError) {
            console.error("AuthContext (Supabase): Failed to update Supabase Auth user_metadata:", updateError.message);
            toast({ title: "Profile Update Failed", description: "Could not update display name in auth.", variant: "destructive" });
            setAppUser(appUser); // Revert optimistic update
            localStorage.setItem(USER_DISPLAY_NAME_KEY, appUser.displayName || '');
            return;
          } else {
            console.log("AuthContext (Supabase): Supabase Auth user_metadata updated successfully.");
          }

          if (appUser?.id) {
            const { error: dbError } = await supabase
              .from('users')
              .update({ display_name: updatedUserData.displayName, updated_at: new Date().toISOString() })
              .eq('id', appUser.id);

            if (dbError) {
              console.error("AuthContext (Supabase): Failed to update display_name in public.users table:", dbError.message);
              toast({ title: "Profile Update Failed", description: "Could not update display name in database.", variant: "destructive" });
            } else {
              console.log("AuthContext (Supabase): display_name in public.users table updated.");
              toast({ title: "Display Name Updated", description: "Your display name has been successfully updated." });
            }
          }
        } catch (error: any) {
            console.error("AuthContext (Supabase): Exception updating user profile:", error);
            toast({ title: "Profile Update Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
            setAppUser(appUser); // Revert
            localStorage.setItem(USER_DISPLAY_NAME_KEY, appUser.displayName || '');
        }
      }
      // For other fields like subscriptionTier, update them if they come from a trusted source (e.g., after payment webhook)
      // For now, we only handle displayName updates initiated by the user.
      else {
         setAppUser(newAppUser); // Apply other non-displayName updates if any
      }
    } else {
      console.warn("AuthContext (Supabase): updateUser called without an active user or session.");
    }
  };


  const loginWithGoogle = async () => {
    console.log("AuthContext (Supabase): Attempting Google login.");
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // options: { redirectTo should be handled by Supabase dashboard "Site URL" }
    });
    // isLoading will be handled by onAuthStateChange
    if (error) {
      console.error("AuthContext (Supabase): Google login error:", error.message);
      toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
      setIsLoading(false); // Ensure loading is false on direct error
    }
    return { error };
  };

  useEffect(() => {
    if (appUser?.displayName) {
      const storedName = localStorage.getItem(USER_DISPLAY_NAME_KEY);
      if (appUser.displayName !== storedName) {
        localStorage.setItem(USER_DISPLAY_NAME_KEY, appUser.displayName);
      }
    } else if (!appUser) {
        localStorage.removeItem(USER_DISPLAY_NAME_KEY);
    }
  }, [appUser]);


  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!appUser && !!session,
      user: appUser,
      session,
      isLoading,
      loginUserWithEmail,
      registerUserWithEmail,
      logoutUser,
      sendPasswordReset,
      updateUser,
      loginWithGoogle,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
