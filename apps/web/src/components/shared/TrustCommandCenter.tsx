import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  Cpu,
  Fingerprint,
  Gauge,
  Globe2,
  LockKeyhole,
  Network,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const nodes = [
  { label: 'Ministry', x: '74%', y: '22%', tone: 'emerald' },
  { label: 'MSMEDA', x: '88%', y: '48%', tone: 'gold' },
  { label: 'Training', x: '69%', y: '76%', tone: 'blue' },
  { label: 'Auditors', x: '24%', y: '72%', tone: 'purple' },
  { label: 'Raft Core', x: '42%', y: '35%', tone: 'white' },
];

const proofSteps = ['Document bytes', 'SHA-256 digest', 'Issuer signature', 'Fabric endorsement', 'Immutable proof'];

export function TrustCommandCenter() {
  return (
    <section className="relative overflow-hidden bg-[#030712] text-white">
      <div className="absolute inset-0 premium-mesh opacity-90" />
      <div className="absolute inset-0 trust-grid opacity-60" />
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-egypt-gold/20 blur-3xl" />

      <div className="relative container mx-auto grid min-h-[760px] max-w-7xl items-center gap-10 px-4 py-20 lg:grid-cols-[1fr_1.05fr] lg:py-28">
        <div className="max-w-3xl">
          <Badge className="mb-6 border-white/15 bg-white/10 px-4 py-1.5 text-white shadow-2xl backdrop-blur">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-egypt-gold-light" />
            Enterprise blockchain trust command center
          </Badge>

          <h1 className="text-balance text-5xl font-black tracking-[-0.055em] text-white md:text-7xl lg:text-8xl">
            Certificates that feel instantly{' '}
            <span className="premium-text-gradient">undeniable.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
            Issue, anchor, verify, and audit SME credentials through a cinematic trust fabric:
            cryptographic hashes, multi-organization endorsement, live verification intelligence,
            and evidence users can understand in seconds.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/verify">
              <Button size="lg" className="h-12 rounded-full bg-white px-7 font-bold text-slate-950 hover:bg-egypt-gold-light">
                Launch verifier
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/onboarding">
              <Button size="lg" variant="outline" className="h-12 rounded-full border-white/20 bg-white/5 px-7 text-white hover:bg-white/15 hover:text-white">
                Experience the journey
              </Button>
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['4-org', 'endorsement'],
              ['3 Raft', 'orderers'],
              ['8 peers', 'sync fabric'],
              ['SHA-256', 'proof core'],
            ].map(([value, label]) => (
              <div key={value} className="glass-panel rounded-2xl p-4">
                <div className="text-2xl font-black text-white">{value}</div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-3xl">
          <div className="absolute inset-0 translate-y-8 rounded-[3rem] bg-egypt-gold/20 blur-3xl" />
          <div className="glass-panel relative overflow-hidden rounded-[2.2rem] border-white/15 p-4 shadow-[0_40px_120px_rgba(0,0,0,0.45)] md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-egypt-gold-light">Live trust fabric</p>
                <h2 className="mt-1 text-2xl font-black">Blockchain propagation</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                Operational
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div className="relative min-h-[390px] overflow-hidden rounded-[1.7rem] border border-white/10 bg-slate-950/65 p-4">
                <div className="absolute inset-0 command-scanline" />
                <svg className="absolute inset-0 h-full w-full opacity-80" viewBox="0 0 640 390" aria-hidden="true">
                  <defs>
                    <linearGradient id="trustEdge" x1="0" x2="1">
                      <stop stopColor="#C5A23D" stopOpacity="0.2" />
                      <stop offset="1" stopColor="#4ADE80" stopOpacity="0.85" />
                    </linearGradient>
                  </defs>
                  {nodes.slice(0, 4).map((node, i) => (
                    <line
                      key={node.label}
                      x1="320"
                      y1="195"
                      x2={parseFloat(node.x) * 6.4}
                      y2={parseFloat(node.y) * 3.9}
                      stroke="url(#trustEdge)"
                      strokeWidth="2"
                      strokeDasharray="8 10"
                      className="edge-pulse"
                      style={{ animationDelay: `${i * 0.28}s` }}
                    />
                  ))}
                </svg>

                <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-egypt-gold/35 bg-egypt-gold/10 shadow-[0_0_70px_rgba(197,162,61,0.35)]">
                  <div className="absolute inset-0 rounded-full trust-orbit" />
                  <Fingerprint className="h-10 w-10 text-egypt-gold-light" />
                </div>

                {nodes.map((node, index) => (
                  <div
                    key={node.label}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: node.x, top: node.y }}
                  >
                    <div className="group relative">
                      <div className="absolute inset-0 rounded-2xl bg-white/20 blur-xl transition group-hover:bg-egypt-gold/40" />
                      <div className="relative min-w-[112px] rounded-2xl border border-white/15 bg-slate-900/90 p-3 text-center shadow-2xl backdrop-blur">
                        <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-white/10">
                          {index === 4 ? <Blocks className="h-5 w-5 text-egypt-gold-light" /> : <RadioTower className="h-5 w-5 text-emerald-300" />}
                        </div>
                        <p className="text-xs font-bold text-white">{node.label}</p>
                        <p className="text-[10px] text-slate-400">synced · 42ms</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
                  {[
                    { icon: LockKeyhole, label: 'mTLS', value: 'sealed' },
                    { icon: Gauge, label: 'trust score', value: '99.8%' },
                    { icon: Cpu, label: 'latency', value: '842ms' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 backdrop-blur">
                      <item.icon className="mb-2 h-4 w-4 text-egypt-gold-light" />
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                      <p className="text-sm font-black text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Proof chain</span>
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div className="space-y-3">
                    {proofSteps.map((step, i) => (
                      <div key={step} className="flex items-center gap-3">
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400/10 text-xs font-black text-emerald-200">
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{step}</p>
                          <div className="mt-1 h-1 rounded-full bg-white/10">
                            <div className="h-1 rounded-full bg-gradient-to-r from-egypt-gold to-emerald-300" style={{ width: `${78 + i * 5}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4 font-mono text-xs text-emerald-200">
                  {[
                    '> digest: a7f4...9c01 locked',
                    '> querying 4 endorsing orgs',
                    '> majority proof accepted',
                    '> revocation index clear',
                  ].map((line) => (
                    <p key={line} className="py-1">{line}</p>
                  ))}
                  <p className="py-1 text-egypt-gold-light">&gt; verdict: TRUSTED</p>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
                  <div className="flex items-center gap-3">
                    <Globe2 className="h-8 w-8 text-egypt-gold-light" />
                    <div>
                      <p className="text-sm font-black text-white">Investor/demo ready</p>
                      <p className="text-xs text-slate-400">Designed for instant trust comprehension.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { icon: Network, title: 'Topology aware', body: 'Shows where proof is replicated.' },
                { icon: Fingerprint, title: 'Crypto transparent', body: 'Hash journey made visible.' },
                { icon: Zap, title: 'Instant evidence', body: 'Verification decisions with context.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <item.icon className="mb-2 h-5 w-5 text-egypt-gold-light" />
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}