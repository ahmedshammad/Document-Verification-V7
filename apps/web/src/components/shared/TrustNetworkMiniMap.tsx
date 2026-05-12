import { CheckCircle2, RadioTower, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustNetworkMiniMapProps {
  className?: string;
  title?: string;
  subtitle?: string;
  connected?: boolean;
}

const peers = [
  { label: 'Ministry', x: 78, y: 22 },
  { label: 'MSMEDA', x: 88, y: 52 },
  { label: 'Training', x: 62, y: 78 },
  { label: 'Auditors', x: 24, y: 68 },
];

export function TrustNetworkMiniMap({
  className,
  title = 'Live trust network',
  subtitle = '4-org Fabric consensus topology',
  connected = true,
}: TrustNetworkMiniMapProps) {
  return (
    <div className={cn('vision-card overflow-hidden p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
          <span className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
          {connected ? 'Synced' : 'Offline'}
        </div>
      </div>

      <div className="relative h-64 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
        <div className="absolute inset-0 premium-mesh opacity-70" />
        <div className="absolute inset-0 trust-grid opacity-35" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="miniEdge" x1="0" x2="1">
              <stop stopColor="#C5A23D" stopOpacity="0.25" />
              <stop offset="1" stopColor="#22c55e" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {peers.map((peer, index) => (
            <line
              key={peer.label}
              x1="50"
              y1="50"
              x2={peer.x}
              y2={peer.y}
              stroke="url(#miniEdge)"
              strokeWidth="0.75"
              strokeDasharray="2 2"
              className="edge-pulse"
              style={{ animationDelay: `${index * 0.18}s` }}
            />
          ))}
        </svg>

        <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-egypt-gold/40 bg-egypt-gold/10 text-egypt-gold-light shadow-[0_0_60px_rgba(197,162,61,0.35)]">
          <div className="absolute inset-0 rounded-full trust-orbit" />
          <ShieldCheck className="h-8 w-8" />
        </div>

        {peers.map((peer) => (
          <div key={peer.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${peer.x}%`, top: `${peer.y}%` }}>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-center text-white shadow-xl backdrop-blur">
              <RadioTower className="mx-auto mb-1 h-4 w-4 text-emerald-300" />
              <p className="text-[10px] font-bold leading-none">{peer.label}</p>
              <p className="mt-1 text-[9px] text-slate-400">peer online</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ['Endorse', '4 orgs'],
          ['Raft', '3 orderers'],
          ['Proof', 'SHA-256'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 p-3">
            <CheckCircle2 className="mb-1 h-4 w-4 text-emerald-600" />
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="text-sm font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}