
"use server";

import { z } from 'zod';
// Firebase Admin SDK would be used here if server actions were to interact with Firebase directly for user management (e.g. custom claims, admin tasks)
// import * as admin from 'firebase-admin'; // Example if using Admin SDK

// The usersDB is now only for simulating the forgotPassword check IF it remains a server action.
// Actual authentication is handled by Firebase Client SDK.
// Consider moving forgotPassword to client-side Firebase SDK as well for consistency.
const usersDB: any[] = [{ email: "user@example.com", password: "password123", displayName: "Demo User" }]; 

// Schemas for validation, still useful even if logic moves client-side for some actions.
const SignInSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const SignUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  displayName: z.string().optional(), // Optional display name
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"], 
});

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});


// signInUser and signUpUser server actions are effectively replaced by client-side Firebase SDK calls.
// They are kept here for reference or if a hybrid approach is ever needed, but are not currently used by the updated auth pages.
export async function signInUser(prevState: any, formData: FormData) {
  console.warn("signInUser server action called - this should be handled by client-side Firebase SDK now.");
  const validatedFields = SignInSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: "Invalid input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
      email: null,
    };
  }
  
  // This is simulated and not connected to actual Firebase Auth
  return {
    message: "This is a simulated server action. Actual sign-in uses Firebase SDK on the client.",
    errors: {},
    success: false, 
    email: validatedFields.data.email,
  };
}

export async function signUpUser(prevState: any, formData: FormData) {
  console.warn("signUpUser server action called - this should be handled by client-side Firebase SDK now.");
  const validatedFields = SignUpSchema.safeParse(Object.fromEntries(formData.entries()));
  
  if (!validatedFields.success) {
    return {
      message: "Invalid input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
      email: null,
    };
  }
  // This is simulated and not connected to actual Firebase Auth
  return {
    message: `This is a simulated server action. Actual sign-up uses Firebase SDK on the client.`,
    success: false,
    errors: {},
    email: validatedFields.data.email,
  };
}

// requestPasswordReset can remain a server action or be moved to client-side.
// If kept as server action, its usersDB check is only for simulation.
export async function requestPasswordReset(prevState: any, formData: FormData) {
  const validatedFields = ForgotPasswordSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: "Invalid input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }
  
  const { email } = validatedFields.data;
  console.log("Password reset requested for (simulated server action):", email);

  // const userExists = usersDB.find(u => u.email === email); // This check is now simulated
  // if (!userExists) {
  //    console.log("Password reset for non-existent user (simulated):", email);
  // }

  // In a real Firebase backend scenario for a server action like this (if not using client SDK):
  // You might use Firebase Admin SDK to generate a reset link or trigger the email.
  // However, client-side `sendPasswordResetEmail` is usually simpler for this flow.
  
  console.log("Placeholder: Server action simulating password reset link for", email);

  return {
    message: "If an account with this email exists, a password reset link has been sent (simulated by server action).",
    success: true, // Simulate success for UI purposes
    errors: {},
  };
}

// This function is not used by the current client-side password reset flow
export async function resetPassword(prevState: any, formData: FormData) {
    console.log("Placeholder: Password reset server action called (not currently used by UI).");
    return { message: "Password has been reset successfully (simulated by server action).", success: true, errors: {} };
}

    