import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Database,
  FlaskConical,
  Gauge,
  Globe2,
  Network,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadialOrbitalTimeline } from '@/components/shared/RadialOrbitalTimeline';
import { vision2030Experiment, trackVision2030Event } from '@/experiments/vision2030';

export function Vision2030ExperiencePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden px-4 py-10 md:py-14 xl:py-16">
        <div className="absolute inset-0 premium-mesh opacity-90" />
        <div className="absolute inset-0 trust-grid opacity-50" />
        <div className="relative container mx-auto max-w-7xl">
          <div className="mx-auto mb-7 max-w-4xl text-center md:mb-8">
            <Badge className="mb-5 border-white/15 bg-white/10 px-4 py-1.5 text-white backdrop-blur">
              <FlaskConical className="mr-1.5 h-3.5 w-3.5 text-egypt-gold-light" />
              A/B Experiment · Version B
            </Badge>
            <h1 className="text-balance text-4xl font-black tracking-[-0.05em] md:text-6xl xl:text-7xl">
              Egypt Vision 2030 <span className="premium-text-gradient">Trust Network</span>
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              A future-facing blockchain verification experience that turns certificate trust into an
              interactive national digital infrastructure story: upload, hash, endorse, synchronize,
              validate, and confirm authenticity in real time.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/">
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-white/20 bg-white/5 px-7 text-white hover:bg-white/15 hover:text-white"
                  onClick={() => trackVision2030Event('compare_version_a_click')}
                >
                  Compare Version A
                </Button>
              </Link>
              <Link to="/verify">
                <Button
                  className="h-12 rounded-full bg-white px-7 font-bold text-slate-950 hover:bg-egypt-gold-light"
                  onClick={() => trackVision2030Event('verification_cta_click')}
                >
                  Launch verification
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          <RadialOrbitalTimeline />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: 'Feature-flag ready',
                body: `Experiment key: ${vision2030Experiment.featureFlag}`,
              },
              {
                icon: BarChart3,
                title: 'Analytics ready',
                body: 'Node clicks, CTA engagement, scroll depth, and time-on-experience are event-ready.',
              },
              {
                icon: ShieldCheck,
                title: 'Rollout safe',
                body: 'Version A remains untouched while Version B can be tested, measured, and iterated safely.',
              },
            ].map((item) => (
              <div key={item.title} className="glass-panel rounded-3xl p-5">
                <item.icon className="mb-3 h-6 w-6 text-egypt-gold-light" />
                <h3 className="font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>

          <section className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="glass-panel rounded-[2rem] p-6">
              <Badge className="mb-4 border-white/15 bg-white/10 text-white">National digital trust ecosystem</Badge>
              <h2 className="text-3xl font-black tracking-tight">From document to national proof infrastructure.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Version B reframes certificate verification as an ecosystem: organizations, peers, orderers,
                encrypted storage, and AI-assisted explanation working together to make trust visible.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ['4', 'Consortium orgs'],
                  ['8', 'Fabric peers'],
                  ['3', 'Raft orderers'],
                  ['100%', 'Audit trail'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                    <p className="text-2xl font-black text-egypt-gold-light">{value}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { icon: Building2, title: 'Government-grade governance', body: 'Role-scoped issuance, revocation, and audit visibility across trusted institutions.' },
                { icon: Network, title: 'Distributed validation', body: 'Every proof is designed around multi-organization endorsement and ledger replication.' },
                { icon: Database, title: 'Privacy-preserving storage', body: 'Only hashes and metadata go on-chain; encrypted payloads remain off-chain.' },
                { icon: Gauge, title: 'Trust intelligence', body: 'Verification states become explainable metrics, not opaque technical responses.' },
              ].map((item) => (
                <div key={item.title} className="glass-panel rounded-[2rem] p-5">
                  <item.icon className="mb-3 h-6 w-6 text-cyan-200" />
                  <h3 className="font-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-4 lg:grid-cols-4">
            {[
              { icon: RadioTower, label: 'Consensus latency', value: 'sub-sec visual', tone: 'text-cyan-200' },
              { icon: ShieldCheck, label: 'Integrity checks', value: 'hash + status', tone: 'text-emerald-200' },
              { icon: Globe2, label: 'Digital governance', value: 'Vision 2030', tone: 'text-egypt-gold-light' },
              { icon: Zap, label: 'Verifier action', value: 'instant proof', tone: 'text-blue-200' },
            ].map((metric) => (
              <div key={metric.label} className="glass-panel rounded-[2rem] p-5 text-center">
                <metric.icon className={`mx-auto mb-3 h-7 w-7 ${metric.tone}`} />
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{metric.label}</p>
                <p className="mt-1 text-lg font-black">{metric.value}</p>
              </div>
            ))}
          </section>

          <section className="mt-10 rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:p-8">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <Badge className="mb-4 border-white/15 bg-white/10 text-white">Verification transparency</Badge>
                <h2 className="text-3xl font-black tracking-tight">Every trust decision becomes explainable.</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  The expanded experience is designed for public-sector demos, investor storytelling,
                  and enterprise buyers who need to understand why a blockchain-backed certificate can be trusted.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  'Hash computed locally and compared against immutable ledger metadata.',
                  'Issuer identity, expiry, and revocation status are surfaced as readable evidence.',
                  'Fabric block/transaction references make every verification audit-ready.',
                ].map((line) => (
                  <div key={line} className="flex items-start gap-3 rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}