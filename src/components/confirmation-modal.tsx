"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useModalAccessibility } from "@/lib/useModalAccessibility";

interface ConfirmationModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean; // New prop
}

export function ConfirmationModal({ message, onConfirm, onCancel, isLoading = false }: ConfirmationModalProps) {
  const modalRef = useModalAccessibility(onCancel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 w-full max-w-sm border border-zinc-200 dark:border-zinc-800"
        ref={modalRef}
      >
        <h3 className="text-lg font-bold mb-4">확인</h3>
        <p className="mb-6">{message}</p>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "확인 중..." : "확인"}
          </Button>
        </div>
      </div>
    </div>
  );
}
