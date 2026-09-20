"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ basePath: "/auth" });

export const { signIn, signUp, signOut, useSession } = authClient;
