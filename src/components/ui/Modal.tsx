"use client";

import { Card } from "./Card";

export function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#1b1a16]/40 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm p-6"
      >
        {children}
      </Card>
    </div>
  );
}
