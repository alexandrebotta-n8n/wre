"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { FlashMessage } from "@/lib/flash";

/**
 * Lê o cookie flash via /api/flash a cada navegação e exibe um toast.
 * Mount no layout root, dentro do <body>.
 */
export function FlashConsumer() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/flash", { cache: "no-store" })
      .then((r) => r.json())
      .then((msg: FlashMessage | null) => {
        if (cancelled || !msg) return;
        const opts = msg.payload?.detalhes ? { description: msg.payload.detalhes } : undefined;
        switch (msg.type) {
          case "success":
            toast.success(msg.message, opts);
            break;
          case "error":
            toast.error(msg.message, opts);
            break;
          case "warning":
            toast.warning(msg.message, opts);
            break;
          default:
            toast.info(msg.message, opts);
        }
      })
      .catch(() => {
        /* silenciar */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, search]);

  return null;
}
