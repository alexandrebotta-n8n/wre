import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400 focus-visible:ring-offset-1 " +
    "disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-peri-600 text-white hover:bg-peri-700 active:bg-peri-700",
        secondary: "bg-navy-900 text-white hover:bg-navy-700",
        outline:
          "border border-neutral-300 bg-white text-navy-900 hover:border-peri-400 hover:bg-peri-50",
        ghost: "text-navy-900 hover:bg-neutral-100",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        link: "text-peri-700 underline-offset-2 hover:underline px-0",
        subtle: "bg-peri-50 text-peri-700 hover:bg-peri-100",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-5 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
