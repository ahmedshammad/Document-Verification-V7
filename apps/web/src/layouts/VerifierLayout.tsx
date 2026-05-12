import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, LayoutDashboard, History, LogOut, Menu, X, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/state/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/verifier', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/verifier/history', icon: History, label: 'Verification History' },
];

export function VerifierLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = () => (
    <>
      <div className="border-b border-white/10 p-4">
        <Link to="/" className="flex items-center gap-2" onClick={closeSidebar}>
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-egypt-gold to-emerald-400 shadow-lg">
            <Shield className="h-4 w-4 text-slate-950" />
          </div>
          <div>
            <span className="text-sm font-black text-white">SME Cert</span>
            <span className="block -mt-0.5 text-[10px] leading-none text-slate-400">Trust Platform</span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={closeSidebar}
            className={cn(
               'portal-nav-item',
              location.pathname === item.path
                 ? 'portal-nav-active'
                 : 'portal-nav-idle'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <User className="h-4 w-4 text-egypt-gold-light" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        {user?.organizationName && (
          <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.organizationName}</span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col portal-shell-bg">
      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-muted">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{user?.organizationName || 'Verifier'}</p>
            </div>
            <Badge variant="navy" className="text-[10px] px-1.5 py-0.5">Verifier</Badge>
          </div>
          <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 -mr-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={closeSidebar} />
            <aside className="portal-sidebar relative flex h-full w-72 flex-col shadow-xl animate-fade-in">
              <button
                onClick={closeSidebar}
                className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted z-10"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className="portal-sidebar hidden w-72 shrink-0 flex-col lg:flex">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
