import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PortalHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  tone?: 'gold' | 'green' | 'blue';
  children?: React.ReactNode;
}

const toneMap = {
  gold: 'from-egypt-gold/30 via-cyan-400/10 to-egypt-navy/40',
  green: 'from-emerald-400/25 via-cyan-300/10 to-egypt-navy/40',
  blue: 'from-cyan-400/25 via-egypt-gold/10 to-egypt-navy/40',
};

export function PortalHero({ eyebrow, title, subtitle, icon: Icon = Sparkles, tone = 'gold', children }: PortalHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_28px_90px_rgba(15,23,42,0.16)] md:p-7">
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', toneMap[tone])} />
      <div className="absolute inset-0 trust-grid opacity-30" />
      <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-egypt-gold/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge className="mb-4 border-white/15 bg-white/10 text-white backdrop-blur">
            <Icon className="mr-1.5 h-3.5 w-3.5 text-egypt-gold-light" />
            {eyebrow}
          </Badge>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">{subtitle}</p>
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </section>
  );
}