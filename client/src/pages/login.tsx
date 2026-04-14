import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Dog } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function Login() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/my-account");
    }
  }, [user, loading, navigate]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/my-account`,
      },
    });
    setIsSending(false);
    if (error) {
      toast({ title: "오류가 발생했습니다", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/my-account`,
      },
    });
    if (error) {
      setIsGoogleLoading(false);
      toast({ title: "Google 로그인 오류", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Dog className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">SpoiltDogs</h1>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-6">
          {sent ? (
            <div className="text-center space-y-3" data-testid="magic-link-sent">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="font-semibold text-lg">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                We sent a magic link to <span className="font-medium text-foreground">{email}</span>. Click the link to sign in.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSent(false)} data-testid="button-back-to-login">
                Use a different email
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-3 h-11"
                onClick={handleGoogle}
                disabled={isGoogleLoading}
                data-testid="button-google-login"
              >
                {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiGoogle className="h-4 w-4" />}
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email-input">Email address</Label>
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    data-testid="input-login-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isSending || !email.trim()}
                  data-testid="button-send-magic-link"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Magic Link
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                No password needed. We'll send a secure sign-in link to your email.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
