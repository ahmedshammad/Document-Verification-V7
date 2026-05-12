import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Blocks,
  CheckCircle2,
  Cpu,
  Database,
  Eye,
  FileCheck,
  Fingerprint,
  Hash,
  Lock,
  Network,
  RadioTower,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackVision2030Event } from '@/experiments/vision2030';

type StageTone = 'gold' | 'cyan' | 'green' | 'blue';

export interface OrbitalStage {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  tone: StageTone;
  node: string;
  metric: string;
  trustScore: number;
  insight: string;
}

const toneStyles: Record<StageTone, { glow: string; text: string; bg: string; stroke: string }> = {
  gold: {
    glow: 'shadow-[0_0_42px_rgba(197,162,61,0.42)]',
    text: 'text-egypt-gold-light',
    bg: 'from-egypt-gold/30 to-yellow-300/10',
    stroke: '#E8D48B',
  },
  cyan: {
    glow: 'shadow-[0_0_42px_rgba(34,211,238,0.36)]',
    text: 'text-cyan-200',
    bg: 'from-cyan-400/30 to-blue-400/10',
    stroke: '#67E8F9',
  },
  green: {
    glow: 'shadow-[0_0_42px_rgba(34,197,94,0.36)]',
    text: 'text-emerald-200',
    bg: 'from-emerald-400/30 to-green-500/10',
    stroke: '#6EE7B7',
  },
  blue: {
    glow: 'shadow-[0_0_42px_rgba(96,165,250,0.34)]',
    text: 'text-blue-200',
    bg: 'from-blue-400/30 to-indigo-400/10',
    stroke: '#93C5FD',
  },
};

export const blockchainVerificationStages: OrbitalStage[] = [
  {
    id: 'upload',
    title: 'Certificate Upload',
    subtitle: 'Secure intake gateway',
    description: 'The certificate file enters a zero-trust verification pipeline with local integrity pre-checks.',
    icon: Upload,
    tone: 'gold',
    node: 'Client Edge',
    metric: '0 ms transfer until consent',
    trustScore: 8,
    insight: 'File stays client-side until the user initiates proof validation.',
  },
  {
    id: 'hash',
    title: 'SHA-256 Hash Generation',
    subtitle: 'Cryptographic fingerprint',
    description: 'A deterministic digest transforms the document into a tamper-evident proof string.',
    icon: Hash,
    tone: 'cyan',
    node: 'Crypto Engine',
    metric: '256-bit digest',
    trustScore: 18,
    insight: 'Any single-byte document change produces a completely different hash.',
  },
  {
    id: 'transaction',
    title: 'Blockchain Transaction Creation',
    subtitle: 'Proof package assembly',
    description: 'Certificate ID, issuer reference, hash, timestamps, and signature proof are prepared for Fabric.',
    icon: Blocks,
    tone: 'blue',
    node: 'Fabric Gateway',
    metric: 'Signed proposal',
    trustScore: 29,
    insight: 'The proposal is signed by the enrolled organization identity before endorsement.',
  },
  {
    id: 'nodes',
    title: 'Distributed Node Validation',
    subtitle: 'Multi-org peer checks',
    description: 'Peers across the consortium simulate the transaction and validate deterministic chaincode rules.',
    icon: Network,
    tone: 'green',
    node: '4 Org Peers',
    metric: '8 peer topology',
    trustScore: 41,
    insight: 'Validation is distributed across ministry, MSMEDA, training, and auditor organizations.',
  },
  {
    id: 'consensus',
    title: 'Consensus Verification',
    subtitle: 'Raft ordered trust',
    description: 'The ordering service sequences endorsed transactions into blocks using a 3-node Raft cluster.',
    icon: RadioTower,
    tone: 'gold',
    node: 'Raft Orderers',
    metric: 'CFT quorum',
    trustScore: 53,
    insight: 'The platform tolerates one orderer failure while preserving transaction ordering.',
  },
  {
    id: 'ledger',
    title: 'Immutable Ledger Recording',
    subtitle: 'World-state commit',
    description: 'Validated proof metadata is committed to the certificates channel and replicated to CouchDB state.',
    icon: Database,
    tone: 'cyan',
    node: 'World State',
    metric: 'Block committed',
    trustScore: 64,
    insight: 'The ledger stores metadata only; sensitive content remains encrypted off-chain.',
  },
  {
    id: 'integrity',
    title: 'Certificate Integrity Validation',
    subtitle: 'Hash-to-ledger comparison',
    description: 'The presented document digest is compared against the active on-chain certificate record.',
    icon: FileCheck,
    tone: 'green',
    node: 'Verifier API',
    metric: 'Hash match',
    trustScore: 76,
    insight: 'A match proves the document was not modified after issuance.',
  },
  {
    id: 'ai',
    title: 'AI Assisted Verification Analysis',
    subtitle: 'Explainable trust layer',
    description: 'The interface translates cryptographic checks into human-readable risk and trust explanations.',
    icon: Cpu,
    tone: 'blue',
    node: 'Insight Layer',
    metric: 'Explainability overlay',
    trustScore: 84,
    insight: 'Users see why a certificate is trusted, not just a green checkmark.',
  },
  {
    id: 'confirmation',
    title: 'Real Time Trust Confirmation',
    subtitle: 'Verifier confidence score',
    description: 'Revocation, expiry, issuer identity, and hash consistency are combined into a trust verdict.',
    icon: ShieldCheck,
    tone: 'gold',
    node: 'Trust Scorer',
    metric: '99.8% confidence',
    trustScore: 93,
    insight: 'The trust score summarizes cryptographic, status, and issuer evidence.',
  },
  {
    id: 'success',
    title: 'Verification Success',
    subtitle: 'Audit-ready result',
    description: 'A downloadable verification report captures the evidence path and transaction references.',
    icon: CheckCircle2,
    tone: 'green',
    node: 'Evidence Report',
    metric: 'Audit trail ready',
    trustScore: 100,
    insight: 'The final result becomes portable proof for employers, regulators, and auditors.',
  },
];

const particles = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  left: `${(index * 17) % 100}%`,
  top: `${(index * 31) % 100}%`,
  delay: `${(index % 9) * 0.34}s`,
  duration: `${4.5 + (index % 7) * 0.55}s`,
}));

export function RadialOrbitalTimeline({ stages = blockchainVerificationStages }: { stages?: OrbitalStage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStage = stages[activeIndex];
  const activeTone = toneStyles[activeStage.tone];

  const positions = useMemo(
    () => stages.map((stage, index) => {
      const angle = -90 + (index * 360) / stages.length;
      const radians = (angle * Math.PI) / 180;
      const radius = 39;
      return {
        stage,
        angle,
        x: 50 + radius * Math.cos(radians),
        y: 50 + radius * Math.sin(radians),
      };
    }),
    [stages],
  );

  const selectStage = (index: number) => {
    setActiveIndex(index);
    trackVision2030Event('timeline_node_interaction', {
      stageId: stages[index].id,
      stageTitle: stages[index].title,
      index,
    });
  };

  return (
    <div className="relative mx-auto grid w-full max-w-7xl items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1.08fr)_400px]">
      <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_32px_110px_rgba(0,0,0,0.38)] md:min-h-[590px] xl:min-h-[620px]">
        <div className="absolute inset-0 premium-mesh opacity-80" />
        <div className="absolute inset-0 trust-grid opacity-45" />
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="vision-particle"
            style={{ left: particle.left, top: particle.top, animationDelay: particle.delay, animationDuration: particle.duration }}
          />
        ))}

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <radialGradient id="visionCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E8D48B" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#0EA5E9" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(232,212,139,0.16)" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(103,232,249,0.15)" strokeWidth="0.25" strokeDasharray="2 2" className="vision-orbit-spin" />
          <circle cx="50" cy="50" r="18" fill="url(#visionCore)" />
          {positions.map(({ stage, x, y }, index) => (
            <line
              key={stage.id}
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              stroke={index <= activeIndex ? toneStyles[stage.tone].stroke : 'rgba(148,163,184,0.16)'}
              strokeWidth={index === activeIndex ? '0.65' : '0.25'}
              strokeDasharray="1.4 1.8"
              className={index <= activeIndex ? 'vision-flow-line' : ''}
            />
          ))}
        </svg>

        <div className="absolute left-1/2 top-1/2 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-egypt-gold/30 bg-white/[0.045] text-center backdrop-blur-xl shadow-[0_0_90px_rgba(197,162,61,0.20)] md:h-40 md:w-40">
          <div className="absolute inset-0 rounded-full trust-orbit" />
          <div>
            <Fingerprint className="mx-auto h-8 w-8 text-egypt-gold-light md:h-10 md:w-10" />
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.24em] text-egypt-gold-light md:text-xs">Trust Core</p>
            <p className="mt-1 text-[10px] text-slate-400">Egypt Vision 2030</p>
          </div>
        </div>

        {positions.map(({ stage, x, y }, index) => {
          const Icon = stage.icon;
          const isActive = index === activeIndex;
          const isComplete = index < activeIndex;
          const tone = toneStyles[stage.tone];

          return (
            <button
              key={stage.id}
              type="button"
              aria-pressed={isActive}
              aria-label={`${stage.title}: ${stage.subtitle}`}
              onClick={() => selectStage(index)}
              className={cn(
                'absolute z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border text-center transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-egypt-gold-light md:h-20 md:w-20 xl:h-22 xl:w-22',
                isActive ? `scale-110 border-white/35 bg-white/15 ${tone.glow}` : 'border-white/10 bg-white/[0.055] hover:scale-105 hover:bg-white/10',
                isComplete && 'border-emerald-300/35 bg-emerald-400/10',
              )}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <Icon className={cn('h-4 w-4 md:h-5 md:w-5', isActive ? tone.text : isComplete ? 'text-emerald-200' : 'text-slate-300')} />
              <span className="mt-1 text-[10px] font-black leading-tight text-white md:text-[11px]">{index + 1}</span>
              <span className="sr-only">{stage.title}</span>
            </button>
          );
        })}
      </div>

      <aside className="glass-panel relative overflow-hidden rounded-[2rem] border-white/10 p-4 text-white md:p-5">
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-80', activeTone.bg)} />
        <div className="absolute inset-0 trust-grid opacity-25" />
        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-egypt-gold-light">Variant B · orbital trust timeline</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{activeStage.title}</h2>
              <p className="mt-1 text-sm text-slate-300">{activeStage.subtitle}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Trust</p>
              <p className={cn('text-2xl font-black', activeTone.text)}>{activeStage.trustScore}%</p>
            </div>
          </div>

          <p className="text-sm leading-6 text-slate-200">{activeStage.description}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <Lock className="mb-3 h-5 w-5 text-egypt-gold-light" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Node</p>
              <p className="mt-1 font-bold">{activeStage.node}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <Activity className="mb-3 h-5 w-5 text-cyan-200" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Signal</p>
              <p className="mt-1 font-bold">{activeStage.metric}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">
              <Eye className="h-4 w-4" /> AI verification insight
            </div>
            <p className="text-sm leading-6 text-slate-300">{activeStage.insight}</p>
          </div>

          <div className="mt-4 grid max-h-60 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:max-h-none lg:grid-cols-1 xl:grid-cols-1">
            {stages.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => selectStage(index)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-2xl border px-2.5 py-2 text-left text-xs transition-all md:text-sm',
                  index === activeIndex
                    ? 'border-egypt-gold/40 bg-white/12 text-white'
                    : 'border-white/5 bg-white/[0.035] text-slate-400 hover:border-white/15 hover:text-white',
                )}
              >
                <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-black', index <= activeIndex ? 'bg-egypt-gold text-slate-950' : 'bg-white/10 text-slate-400')}>
                  {index + 1}
                </span>
                <span className="truncate">{stage.title}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}