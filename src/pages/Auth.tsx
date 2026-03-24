import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import InteractiveHeroBg from '@/components/InteractiveHeroBg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/admin', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Custom password validation (bypass native tooltip)
    if (!forgotPassword && password.length < 6) {
      sonnerToast('Password must be at least 6 characters', { duration: 5000 });
      return;
    }

    setLoading(true);

    try {
      if (forgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: 'Check your email', description: 'Password reset link sent.' });
        setForgotPassword(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Check if MFA challenge is required
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.nextLevel === 'aal2' && aalData.nextLevel !== aalData.currentLevel) {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totp = factors?.totp?.[0];
          if (totp) { setMfaFactorId(totp.id); return; }
        }
        navigate('/admin');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // Show full confirmation card instead of bare toast
        setShowEmailSent(true);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      toast({ title: 'Email resent', description: `Confirmation sent to ${email}` });
    } catch (err: any) {
      toast({ title: 'Failed to resend', description: err.message, variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    setLoading(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.id, code: mfaCode });
      if (vErr) throw vErr;
      navigate('/admin');
    } catch (err: any) {
      toast({ title: 'Invalid code', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Show loading indicator while checking auth state
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="font-mono text-sm text-muted-foreground">Checking your session...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <InteractiveHeroBg />
      <div className="relative mx-auto max-w-md px-6 py-16 md:py-24">
        <div className="mb-10 text-center">
          <Link to="/">
            <img src="/logo.svg" alt="Digiiworks" className="mx-auto mb-6" style={{ width: 160 }} />
          </Link>
          <h1 className="font-mono text-2xl font-bold">
            <span className="text-gradient">
              {mfaFactorId ? 'Two-Factor Auth' : forgotPassword ? 'Reset Password' : isLogin ? '' : showEmailSent ? 'Check Your Inbox' : 'Create Account'}
            </span>
          </h1>
        </div>

        <div className="glass-card glass-card-glow p-6 md:p-8">
          {mfaFactorId ? (
            <div className="space-y-4">
              <p className="font-mono text-sm text-center text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
              <Input
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                placeholder="000000"
                className="text-center font-mono text-lg tracking-widest border-border bg-background/50 focus:border-primary/50"
                inputMode="numeric"
                autoFocus
              />
              <Button
                className="w-full font-mono glow-blue bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleMfaVerify}
                disabled={loading || mfaCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
              <button
                onClick={() => { setMfaFactorId(null); setMfaCode(''); }}
                className="block w-full font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to Sign In
              </button>
            </div>
          ) : showEmailSent ? (
            /* Email confirmation card */
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-mono text-sm font-semibold">Confirmation email sent</p>
                <p className="text-xs text-muted-foreground">We sent a link to</p>
                <p className="font-mono text-sm text-primary">{email}</p>
              </div>
              <ol className="space-y-1 text-left text-xs text-muted-foreground list-decimal list-inside">
                <li>Open the email from Digiiworks</li>
                <li>Click the confirmation link</li>
                <li>You'll be signed in automatically</li>
              </ol>
              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full font-mono text-xs"
                  onClick={handleResendEmail}
                  disabled={resending}
                >
                  {resending ? 'Sending...' : "Didn't get it? Resend email"}
                </Button>
                <button
                  onClick={() => { setShowEmailSent(false); setIsLogin(true); }}
                  className="block w-full font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            /* Normal form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && !forgotPassword && (
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Name</Label>
                  <Input
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="border-border bg-background/50 focus:border-primary/50"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-border bg-background/50 focus:border-primary/50"
                />
              </div>

              {!forgotPassword && (
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-border bg-background/50 focus:border-primary/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {!isLogin && (
                    <p className="text-[10px] text-muted-foreground font-mono">Minimum 6 characters</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full font-mono glow-blue bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading
                  ? 'Processing...'
                  : forgotPassword
                    ? 'Send Reset Link'
                    : isLogin
                      ? 'Sign In'
                      : 'Create Account'}
              </Button>
            </form>
          )}

          {!showEmailSent && (
            <div className="mt-5 space-y-2 text-center">
              {isLogin && !forgotPassword && (
                <button
                  onClick={() => setForgotPassword(true)}
                  className="block w-full font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              )}
              {forgotPassword && (
                <button
                  onClick={() => setForgotPassword(false)}
                  className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to Sign In
                </button>
              )}
              {!forgotPassword && (
                <button
                  onClick={() => { setIsLogin(!isLogin); setForgotPassword(false); }}
                  className="block w-full font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up as a client" : 'Already have an account? Sign in'}
                </button>
              )}
            </div>
          )}

          <div className="mt-8 mb-6 text-center">
            <Link to="/" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-3 w-3" /> Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
