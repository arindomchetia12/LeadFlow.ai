'use client';

import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, RedirectToSignIn, Show, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/screens/not-found';
import { LandingPage, PricingPage } from '@/screens/public';
import { AuthPage } from '@/screens/auth';
import { PublicChatPage } from '@/screens/chat';
import {
  AnalyticsPage,
  AssistantPage,
  AutomationPage,
  BusinessPage,
  ConversationsPage,
  LeadsPage,
  OverviewPage,
  SettingsPage,
} from '@/screens/dashboard';
import {
  Route,
  Redirect,
  Switch,
  Router as WouterRouter,
  useLocation,
} from 'wouter';

const queryClient = new QueryClient();
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') ?? '';
const clerkPubKey = publishableKeyFromHost(
  typeof window === 'undefined' ? '' : window.location.hostname,
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = process.env.NEXT_PUBLIC_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#159477',
    colorForeground: '#15252a',
    colorMutedForeground: '#6e7e82',
    colorDanger: '#be5a4e',
    colorBackground: '#fbfcfa',
    colorInput: '#ffffff',
    colorInputForeground: '#15252a',
    colorNeutral: '#dbe4e1',
    fontFamily: 'Manrope, sans-serif',
    borderRadius: '0.8rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbfcfa] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#15252a]',
    headerSubtitle: 'text-[#6e7e82]',
    socialButtonsBlockButtonText: 'text-[#15252a]',
    formFieldLabel: 'text-[#15252a]',
    footerActionLink: 'text-[#159477]',
    footerActionText: 'text-[#6e7e82]',
    dividerText: 'text-[#6e7e82]',
    identityPreviewEditButton: 'text-[#159477]',
    formFieldSuccessText: 'text-[#159477]',
    alertText: 'text-[#be5a4e]',
    logoBox: 'mb-5',
    logoImage: 'max-h-9',
    socialButtonsBlockButton: 'border-[#dbe4e1] bg-white',
    formButtonPrimary: 'bg-[#159477] hover:bg-[#117c64]',
    formFieldInput: 'border-[#dbe4e1] bg-white text-[#15252a]',
    footerAction: 'border-[#dbe4e1]',
    dividerLine: 'bg-[#dbe4e1]',
    alert: 'border-[#f1d0cb] bg-[#fff5f3]',
    otpCodeFieldInput: 'border-[#dbe4e1] bg-white',
    formFieldRow: 'mb-4',
    main: 'bg-transparent',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#eef4f1] px-4 py-8">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#eef4f1] px-4 py-8">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/dashboard"><Protected><OverviewPage /></Protected></Route>
        <Route path="/dashboard/leads"><Protected><LeadsPage /></Protected></Route>
        <Route path="/dashboard/conversations/:id?"><Protected><ConversationsPage /></Protected></Route>
        <Route path="/dashboard/assistant"><Protected><AssistantPage /></Protected></Route>
        <Route path="/dashboard/business"><Protected><BusinessPage /></Protected></Route>
        <Route path="/dashboard/automation"><Protected><AutomationPage /></Protected></Route>
        <Route path="/dashboard/analytics"><Protected><AnalyticsPage /></Protected></Route>
        <Route path="/dashboard/settings"><Protected><SettingsPage /></Protected></Route>
        <Route path="/chat/:businessSlug" component={PublicChatPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProvider
        publishableKey={clerkPubKey}
        proxyUrl={clerkProxyUrl}
        appearance={clerkAppearance}
        signInUrl={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      >
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </WouterRouter>
  );
}

export default App;
