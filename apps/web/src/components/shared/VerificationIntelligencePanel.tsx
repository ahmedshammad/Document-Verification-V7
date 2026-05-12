import { Blocks, CheckCircle2, FileDigit, Fingerprint, Gauge, Network, Radar, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationIntelligencePanelProps {
  method: 'id' | 'qr' | 'file';
  resultStatus?: string;
  fileHash?: string;
}

const methodCopy = {
  id: 'Certificate ID lookup routes directly to the ledger-backed certificate record.',
  qr: 'QR scan extracts the verification URL, resolves the certificate ID, and queries proof metadata.',
  file: 'Local SHA-256 hashing compares the uploaded document against anchored certificate evidence.',
};

export function VerificationIntelligencePanel({ method, resultStatus, fileHash }: VerificationIntelligencePanelProps) {
  const isVerified = resultStatus === 'VALID';

  return (
    <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="relative bg-slate-950 p-5 text-white md:p-6">
        <div className="absolute inset-0 premium-mesh opacity-60" />
        <div className="relative grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-egypt-gold-light">
              <Radar className="h-4 w-4" /> Verification intelligence overlay
            </div>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">Transparent proof, not a black box.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{methodCopy[method]}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: FileDigit, label: 'Input', value: method === 'file' ? 'Document hash' : method === 'qr' ? 'QR payload' : 'Certificate ID' },
                { icon: Network, label: 'Network', value: '4-org Fabric' },
                { icon: ShieldCheck, label: 'Verdict', value: resultStatus || 'Awaiting proof' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur">
                  <item.icon className="mb-2 h-4 w-4 text-egypt-gold-light" />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-sm font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Trust telemetry</span>
              <Gauge className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="grid grid-cols-[96px_1fr] items-center gap-4">
              <div className={cn('grid h-24 w-24 place-items-center rounded-full border-4', isVerified ? 'border-emerald-300 text-emerald-200' : 'border-egypt-gold text-egypt-gold-light')}>
                <div className="text-center">
                  <p className="text-2xl font-black">{isVerified ? '100' : '—'}</p>
                  <p className="text-[10px] uppercase tracking-[0.22em]">score</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  ['Hash consistency', fileHash ? 'ready' : 'pending'],
                  ['Revocation check', resultStatus ? 'complete' : 'armed'],
                  ['Issuer identity', resultStatus ? 'resolved' : 'waiting'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-bold text-white">{value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-egypt-gold to-emerald-300" style={{ width: resultStatus ? '100%' : fileHash ? '72%' : '38%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-slate-200 md:grid-cols-4">
        {[
          { icon: Fingerprint, title: 'SHA-256', body: 'Deterministic document fingerprint' },
          { icon: Blocks, title: 'World state', body: 'Ledger metadata and status' },
          { icon: Network, title: 'Consensus', body: 'Multi-organization trust fabric' },
          { icon: CheckCircle2, title: 'Evidence', body: 'Downloadable verification report' },
        ].map((item) => (
          <div key={item.title} className="bg-white p-4">
            <item.icon className="mb-2 h-5 w-5 text-egypt-navy" />
            <p className="font-bold text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}