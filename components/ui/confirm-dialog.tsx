"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "./dialog";
import { Button, type ButtonProps } from "./button";
import { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent } from "./tooltip";

export interface ConfirmDialogProps {
  /** Trigger renderizado em torno disso (use asChild para herdar). */
  trigger: React.ReactNode;
  /** Tooltip opcional no trigger. Renderizado com os triggers aninhados
   *  (TooltipTrigger → DialogTrigger → trigger) para compor corretamente sobre
   *  o mesmo nó DOM — evita o erro de hidratação de dois `asChild` aninhados
   *  em volta de um componente função. */
  tooltip?: React.ReactNode;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  title: string;
  description?: React.ReactNode;
  /** Server action ou client handler. Se for server action, o form é submetido com hiddenFields. */
  action?: (formData: FormData) => void | Promise<void>;
  /** Campos hidden para enviar ao action. */
  hiddenFields?: Record<string, string>;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonProps["variant"];
  /** Quando definido e true, o botão de confirmação fica desabilitado. */
  disabled?: boolean;
}

export function ConfirmDialog({
  trigger,
  tooltip,
  tooltipSide = "top",
  title,
  description,
  action,
  hiddenFields,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  disabled,
}: ConfirmDialogProps) {
  return (
    <Dialog>
      {tooltip ? (
        <TooltipProvider delayDuration={300}>
          <TooltipRoot>
            {/* Wrapper <span> entre os dois triggers: evita que dois `asChild`
                (Tooltip + Dialog) mesclem props no MESMO componente-função, o
                que causava erro de hidratação. Agora só o DialogTrigger usa
                asChild no Button; o Tooltip ancora no span. Bônus: tooltip
                funciona mesmo quando o botão está `disabled` (botão desabilitado
                não emite os eventos de ponteiro que o tooltip precisa). */}
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <DialogTrigger asChild>{trigger}</DialogTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
          </TooltipRoot>
        </TooltipProvider>
      ) : (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">{cancelLabel}</Button>
          </DialogClose>
          {action ? (
            <form action={action} className="contents">
              {hiddenFields &&
                Object.entries(hiddenFields).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
              <Button type="submit" variant={variant} disabled={disabled}>
                {confirmLabel}
              </Button>
            </form>
          ) : (
            <Button type="button" variant={variant} disabled={disabled}>
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
