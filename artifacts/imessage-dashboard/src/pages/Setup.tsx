import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { useGetSystemStatus, getGetSystemStatusQueryKey, useGetMacAgentStatus, getGetMacAgentStatusQueryKey, useGetSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Server, Terminal, Apple, ShieldAlert, RefreshCw, Download, Zap, Settings as SettingsIcon, MessageSquare, ArrowRight, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Setup() {
  const queryClient = useQueryClient();
  const { data: status, isLoading: isLoadingSystem } = useGetSystemStatus();
  const { data: settings } = useGetSettings();
  const { data: macStatus, isLoading: isLoadingMac } = useGetMacAgentStatus({
    query: {
      queryKey: getGetMacAgentStatusQueryKey(),
      refetchInterval: 15000
    }
  });

  const [activeStep, setActiveStep] = useState(1);

  // Auto-advance logic based on live state
  useEffect(() => {
    if (macStatus?.connected && status?.messagesAppAvailable) {
      setActiveStep(6);
    } else if (macStatus?.connected) {
      setActiveStep(4);
    } else if (settings?.macAgentUrl) {
      setActiveStep(3); // URL set but not connected
    } else if (activeStep < 2) {
      setActiveStep(1); // Default
    }
  }, [macStatus?.connected, settings?.macAgentUrl, status?.messagesAppAvailable]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetSystemStatusQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMacAgentStatusQueryKey() });
  };

  const StepCard = ({ 
    step, 
    title, 
    icon: Icon, 
    isCompleted, 
    isActive,
    children 
  }: { 
    step: number, 
    title: string, 
    icon: any, 
    isCompleted: boolean, 
    isActive: boolean,
    children: React.ReactNode 
  }) => {
    return (
      <Card className={`border-border bg-card transition-all duration-300 ${isActive ? 'shadow-[0_4px_24px_rgba(0,195,255,0.1)] border-primary/30' : 'opacity-80'}`}>
        <CardHeader className={`pb-4 border-b ${isActive ? 'bg-primary/5 border-primary/20' : 'bg-secondary/10 border-border'} transition-colors duration-300`}>
          <div className="flex items-center justify-between">
            <CardTitle className={`font-mono text-sm uppercase tracking-widest flex items-center gap-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isCompleted ? 'bg-[#34c759]/20 text-[#34c759]' : isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : step}
              </div>
              <Icon className="w-4 h-4" />
              {title}
            </CardTitle>
            {isCompleted && (
              <Badge variant="outline" className="bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 font-mono uppercase text-[10px]">
                Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        <AnimatePresence>
          {(isActive || isCompleted || activeStep > step) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-4 pb-6 px-6">
                {children}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  };

  const Badge = ({ children, className, variant }: { children: React.ReactNode, className?: string, variant?: string }) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Server className="w-6 h-6 text-primary" />
            ONBOARDING GUIDE
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Complete these steps to establish the messaging bridge</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          className="font-mono text-xs border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors bg-secondary/20"
        >
          <RefreshCw className={`w-3 h-3 mr-2 ${isLoadingSystem || isLoadingMac ? 'animate-spin' : ''}`} />
          Check Status
        </Button>
      </div>

      <div className="grid gap-6 mt-8 relative before:absolute before:inset-0 before:ml-9 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        
        {/* Step 1: Download Mac Agent */}
        <StepCard 
          step={1} 
          title="Download Mac Agent" 
          icon={Download} 
          isActive={activeStep === 1}
          isCompleted={activeStep > 1}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Mac Agent is a background process that runs on your physical Mac. It bridges the gap between this web dashboard and your native Messages.app using AppleScript.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link href="/settings" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 border-primary/20 hover:border-primary/50 text-primary">
                Go to Settings
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <span className="text-xs text-muted-foreground font-mono">Download the setup script and run it in Terminal.</span>
            </div>
          </div>
        </StepCard>

        {/* Step 2: Start a Tunnel */}
        <StepCard 
          step={2} 
          title="Start Secure Tunnel" 
          icon={Zap} 
          isActive={activeStep === 2}
          isCompleted={activeStep > 2}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              To allow this dashboard to securely talk to your Mac, you need to expose the local agent port (3001) to the internet using a secure tunnel.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-secondary/20 p-4 rounded-md border border-border">
                <div className="text-xs font-mono text-primary mb-2">Cloudflare (Recommended)</div>
                <pre className="text-xs font-mono bg-black/60 p-2 rounded text-primary/90 border border-primary/20">
                  npx cloudflared tunnel --url http://localhost:3001
                </pre>
              </div>
              <div className="bg-secondary/20 p-4 rounded-md border border-border">
                <div className="text-xs font-mono text-primary mb-2">ngrok</div>
                <pre className="text-xs font-mono bg-black/60 p-2 rounded text-primary/90 border border-primary/20">
                  ngrok http 3001
                </pre>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setActiveStep(3)} variant="outline" size="sm" className="font-mono text-xs">
                Next Step <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </div>
          </div>
        </StepCard>

        {/* Step 3: Configure URL */}
        <StepCard 
          step={3} 
          title="Configure Agent URL" 
          icon={SettingsIcon} 
          isActive={activeStep === 3}
          isCompleted={macStatus?.connected || activeStep > 3}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Copy the HTTPS URL generated by your tunnel in the previous step, and paste it into the Dashboard Settings.
            </p>
            
            <div className="p-4 border border-border rounded-md bg-secondary/10 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono uppercase">Current Status:</span>
                {macStatus?.connected ? (
                  <span className="flex items-center text-xs font-mono text-[#34c759]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> CONNECTED
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-mono text-destructive">
                    <XCircle className="w-3 h-3 mr-1" /> NOT CONNECTED
                  </span>
                )}
              </div>
              {!macStatus?.connected && (
                <div className="flex items-center gap-4 mt-2">
                  <Link href="/settings" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 bg-primary text-primary-foreground border-none">
                    Configure in Settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        </StepCard>

        {/* Step 4: Text Message Forwarding */}
        <StepCard 
          step={4} 
          title="Enable iPhone Forwarding" 
          icon={Phone} 
          isActive={activeStep === 4}
          isCompleted={activeStep > 4}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              To send standard SMS (green bubble) messages to non-Apple devices, your Mac needs permission to route messages through your iPhone.
            </p>
            <div className="bg-secondary/10 p-4 rounded-md border border-border">
              <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/80 font-mono">
                <li>Open <strong className="text-foreground">Settings</strong> on your iPhone</li>
                <li>Scroll down and tap <strong className="text-foreground">Messages</strong></li>
                <li>Tap <strong className="text-foreground">Text Message Forwarding</strong></li>
                <li>Find your Mac in the list and toggle the switch to <strong className="text-[#34c759]">ON</strong></li>
              </ol>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setActiveStep(5)} variant="outline" size="sm" className="font-mono text-xs">
                I've done this <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </div>
          </div>
        </StepCard>

        {/* Step 5: Sign in to Messages */}
        <StepCard 
          step={5} 
          title="Sign in to Messages.app" 
          icon={Apple} 
          isActive={activeStep === 5}
          isCompleted={status?.messagesAppAvailable && activeStep > 5}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open the native Messages.app on your Mac and ensure you are fully signed in with your Apple ID. The app must be running in the background for AppleScript to interact with it.
            </p>
            
            <div className="p-4 border border-border rounded-md bg-secondary/10 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono uppercase text-muted-foreground">Messages.app Status:</span>
                {status?.messagesAppAvailable ? (
                  <span className="flex items-center text-xs font-mono text-[#34c759]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> DETECTED
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-mono text-amber-500">
                    <AlertCircle className="w-3 h-3 mr-1" /> VERIFYING...
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button onClick={() => setActiveStep(6)} variant="outline" size="sm" className="font-mono text-xs">
                Next <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </div>
          </div>
        </StepCard>

        {/* Step 6: Send first message */}
        <StepCard 
          step={6} 
          title="Send First Message" 
          icon={MessageSquare} 
          isActive={activeStep === 6}
          isCompleted={false}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-center p-6 text-center flex-col gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,195,255,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">System Ready</h3>
                <p className="text-sm text-muted-foreground mt-1">The bridge is fully operational.</p>
              </div>
            </div>
            
            <div className="flex justify-center pb-2">
              <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow hover:bg-primary/90 h-10 px-8 py-2 bg-primary text-primary-foreground font-mono uppercase tracking-widest shadow-[0_0_15px_rgba(0,195,255,0.3)]">
                Go to Compose
              </Link>
            </div>
          </div>
        </StepCard>

      </div>
    </div>
  );
}
