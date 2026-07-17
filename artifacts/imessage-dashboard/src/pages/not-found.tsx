import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="space-y-2">
        <p className="text-6xl font-bold font-mono text-primary/30">404</p>
        <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          This page doesn't exist. You may have followed a broken link.
        </p>
      </div>
      <Link href="/">
        <Button variant="outline" className="font-medium border-border hover:border-primary/30 hover:text-primary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Compose
        </Button>
      </Link>
    </div>
  );
}
