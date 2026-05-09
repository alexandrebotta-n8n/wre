"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "./dialog";
import { Button, type ButtonProps } from "./button";

export interface ConfirmDialogProps {
  /** Trigger renderizado em torno disso (use asChild para herdar). */
  trigger: React.ReactNode;
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
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
