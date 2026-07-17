import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Shell } from '@/components/layout/Shell';
import { Toaster } from 'sonner';

// Pages
import Dashboard from '@/pages/Dashboard';
import Compose from '@/pages/Compose';
import Activity from '@/pages/Activity';
import ConnectedMacs from '@/pages/ConnectedMacs';
import Devices from '@/pages/Devices';
import Logs from '@/pages/Logs';
import Setup from '@/pages/Setup';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/compose" component={Compose} />
        <Route path="/activity" component={Activity} />
        <Route path="/macs" component={ConnectedMacs} />
        <Route path="/devices" component={Devices} />
        <Route path="/logs" component={Logs} />
        <Route path="/setup" component={Setup} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'hsl(200 80% 5.5%)',
              border: '1px solid hsl(200 50% 14%)',
              color: 'hsl(200 15% 91%)',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '13px',
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
