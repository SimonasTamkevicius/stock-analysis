"use client";

import { useState } from "react";
import { Info } from "lucide-react";

type SectionHeaderProps = {
  title: string;
  description: string;
};

export default function SectionHeader({ title, description }: SectionHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-10 pl-2">
      <h2 className="text-4xl font-display font-black tracking-tighter text-text-primary mb-3 leading-none">
        {title}
      </h2>
      <p className="text-base text-text-secondary max-w-3xl leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
}
