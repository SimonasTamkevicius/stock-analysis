"use client";

type SectionHeaderProps = {
  title: string;
  description: string;
};

export default function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-display font-black tracking-tight text-text-primary mb-1">
        {title}
      </h2>
      <p className="text-xs text-text-muted leading-relaxed max-w-xl">
        {description}
      </p>
    </div>
  );
}
