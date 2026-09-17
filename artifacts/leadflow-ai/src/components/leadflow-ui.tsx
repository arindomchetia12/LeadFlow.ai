import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  ChevronDown,
  CircleHelp,
  Gauge,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  PanelLeft,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" data-testid="brand-leadflow">
      <div className="relative flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-sm">
        <span className="absolute size-3.5 rounded-full border-2 border-current" />
        <span className="absolute h-2.5 w-[2px] translate-x-[5px] -translate-y-[5px] rotate-45 rounded-full bg-current" />
      </div>
      {!compact && <span className="font-extrabold tracking-[-0.05em]">LeadFlow<span className="text-primary">.ai</span></span>}
    </div>
  );
}

const nav = [
  { href: '/dashboard', label: 'Overview', icon: Gauge, end: true },
  { href: '/dashboard/leads', label: 'Leads', icon: Target },
  { href: '/dashboard/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/dashboard/assistant', label: 'AI assistant', icon: Bot },
];
const manage = [
  { href: '/dashboard/business', label: 'Business profile', icon: Building2 },
  { href: '/dashboard/automation', label: 'Automation', icon: Zap },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const active = (href: string, end?: boolean) => end ? location === href : location.startsWith(href);
  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[246px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
        <div className="mb-9 px-2 text-sidebar-accent-foreground"><Mark /></div>
        <div className="mb-3 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45">Workspace</div>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon, end }) => (
            <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={cn('group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors', active(href, end) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground')}>
              <Icon className={cn('size-[17px]', active(href, end) && 'text-sidebar-primary')} strokeWidth={active(href, end) ? 2.4 : 1.8} />
              <span>{label}</span>
              {label === 'Leads' && <span className="ml-auto rounded bg-sidebar-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-sidebar-primary">live</span>}
            </Link>
          ))}
        </nav>
        <div className="mb-3 mt-8 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45">Manage</div>
        <nav className="space-y-1">
          {manage.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors', active(href) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground')}>
              <Icon className="size-[17px]" strokeWidth={1.8} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-sidebar-border bg-sidebar-accent/45 p-3.5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-sidebar-accent-foreground"><Sparkles className="size-3.5 text-sidebar-primary" />AI is learning</div>
          <p className="text-[11px] leading-relaxed text-sidebar-foreground/60">Your assistant has enough signal to qualify leads automatically.</p>
          <div className="mt-3 h-1 rounded-full bg-sidebar-border"><div className="h-full w-[72%] rounded-full bg-sidebar-primary" /></div>
          <p className="mt-1.5 font-mono text-[9px] text-sidebar-foreground/40">72% knowledge coverage</p>
        </div>
        <button type="button" data-testid="button-sidebar-account" onClick={() => setLocation('/dashboard/settings')} className="mt-4 flex items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent">
          <div className="flex size-8 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">AM</div>
          <div className="min-w-0"><p className="truncate text-xs font-semibold text-sidebar-accent-foreground">Alex Morgan</p><p className="truncate text-[10px] text-sidebar-foreground/50">admin@northstar.co</p></div>
          <ChevronDown className="ml-auto size-3.5 text-sidebar-foreground/50" />
        </button>
      </aside>
      <div className="lg:pl-[246px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" data-testid="button-mobile-menu" className="rounded-md p-2 hover:bg-muted lg:hidden"><PanelLeft className="size-5" /></button>
            <div className="relative hidden w-[280px] md:block"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input data-testid="input-global-search" placeholder="Search anything..." className="h-9 border-transparent bg-muted/70 pl-9 text-xs focus-visible:border-primary/40" /></div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold text-primary sm:flex"><span className="size-1.5 rounded-full bg-primary" />Assistant online</div>
            <Button variant="ghost" size="icon" data-testid="button-theme" className="size-9 text-muted-foreground"><Moon className="size-4" /></Button>
            <Button variant="ghost" size="icon" data-testid="button-help" className="size-9 text-muted-foreground"><CircleHelp className="size-4" /></Button>
            <div className="ml-1 flex size-8 items-center justify-center rounded-full bg-accent text-xs font-extrabold text-accent-foreground">AM</div>
          </div>
        </header>
        <main className="lf-page mx-auto max-w-[1440px] px-5 py-7 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div><div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{eyebrow ?? 'Workspace'}</div><h1 className="text-2xl font-extrabold tracking-[-0.05em] text-foreground sm:text-[30px]">{title}</h1>{description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div>
    {action}
  </div>;
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-3 flex items-center justify-between"><h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{children}</h2>{action}</div>;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: { title: string; description: string; icon?: typeof Inbox; action?: ReactNode }) {
  return <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 text-center"><div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 text-center"><div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><Activity className="size-5" /></div><h3 className="text-sm font-bold">Couldn’t load this view</h3><p className="mt-1 text-xs text-muted-foreground">The workspace is having trouble reaching your data.</p><Button size="sm" variant="outline" onClick={onRetry} data-testid="button-retry" className="mt-4">Try again</Button></div>;
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return <div className="space-y-3">{Array.from({ length: count }).map((_, i) => <div key={i} className="lf-skeleton h-14 rounded-lg" />)}</div>;
}
