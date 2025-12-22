"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Check if current path is protected
        const protectedPaths = ['/players', '/players/rate', '/admin', '/profile', '/teams'];
        const isProtected = protectedPaths.some((path) =>
          pathname === path || pathname?.startsWith(`${path}/`)
        );
        
        if (isProtected) {
          router.push('/login');
        }
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClient, router, pathname]);

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
}
