"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
  loading?: boolean;
}

/**
 * Accessible confirmation dialog component
 * Replaces native window.confirm() with ARIA-compliant AlertDialog
 * 
 * @example
 * const [showConfirm, setShowConfirm] = useState(false);
 * 
 * <ConfirmDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Hapus Data"
 *   description="Apakah Anda yakin ingin menghapus data ini?"
 *   onConfirm={async () => {
 *     await deleteMutation({ id });
 *     toast.success("Data berhasil dihapus");
 *   }}
 *   variant="destructive"
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  onConfirm,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {loading ? "Memproses..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook for imperative confirmation dialogs
 * Provides a promise-based API similar to window.confirm()
 * 
 * @example
 * const confirm = useConfirm();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: "Hapus Data",
 *     description: "Apakah Anda yakin?",
 *     variant: "destructive"
 *   });
 *   
 *   if (confirmed) {
 *     await deleteMutation({ id });
 *   }
 * }
 */
export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
    resolve?: (value: boolean) => void;
  }>({
    open: false,
    title: "",
    description: "",
  });

  const confirm = React.useCallback(
    (options: {
      title: string;
      description: string;
      confirmText?: string;
      cancelText?: string;
      variant?: "default" | "destructive";
    }) => {
      return new Promise<boolean>((resolve) => {
        setState({
          open: true,
          ...options,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, open: false }));
  }, [state.resolve]);

  const handleCancel = React.useCallback(() => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, open: false }));
  }, [state.resolve]);

  const dialog = (
    <AlertDialog open={state.open} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          <AlertDialogDescription>{state.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {state.cancelText || "Batal"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              state.variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {state.confirmText || "Konfirmasi"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
