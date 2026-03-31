import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AuthPageProps {
  onAuth: (email: string, password: string, isSignUp: boolean) => Promise<{ error: any }>;
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await onAuth(email, password, isSignUp);
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Deal Tracker</h1>
          <p className="text-sm text-muted-foreground">Healthcare PE Pipeline</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-card border-border"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-card border-border"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : isSignUp ? "Sign Up" : "Sign In"}
          </Button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
