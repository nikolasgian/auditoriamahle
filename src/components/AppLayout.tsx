import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Cog,
  Settings,
  ClipboardCheck,
  CalendarDays,
  Smartphone,
  FileText,
  BarChart3,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/machines', label: 'Máquinas', icon: Cog },
  { path: '/checklists', label: 'Checklists', icon: ClipboardCheck },
  { path: '/checklist-template', label: 'Modelo LPA', icon: FileText },
  { path: '/schedule', label: 'Cronograma', icon: CalendarDays },
  { path: '/mobile-audit', label: 'Auditoria Mobile', icon: Smartphone },
  { path: '/my-audits', label: 'Minhas auditorias', icon: ClipboardCheck },
  { path: '/reports', label: 'Relatórios', icon: FileText },
  { path: '/analytics', label: 'Análise Gráfica', icon: BarChart3 },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <Shield className="h-7 w-7 text-sidebar-primary" />
          <div>
            <h1 className="text-lg font-bold text-sidebar-primary-foreground">LPA Audit</h1>
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">Sistema de Auditoria</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-6 py-4">
          <p className="text-xs text-sidebar-foreground/40">LPA Audit System v1.0</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 lg:px-6 no-print">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">Gestor LPA</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
