import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumb, meta, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center text-xs text-neutral-500">
          <ol className="flex items-center gap-1 flex-wrap">
            {breadcrumb.map((item, idx) => (
              <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight className="h-3 w-3 text-neutral-400" aria-hidden />}
                {item.href ? (
                  <Link href={item.href} className="hover:text-peri-700 hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-neutral-700">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 truncate">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-neutral-600">{description}</p>
          )}
          {meta && (
            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-neutral-600">
              {meta}
            </div>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
