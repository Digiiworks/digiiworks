import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import InteractiveHeroBg from '@/components/InteractiveHeroBg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        // AuthContext handles role loading; navigate to admin — Dashboard component
        // renders the correct view based on role.
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
        toast({ title: 'Check your email', description: 'Confirm your email to continue.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Show nothing while checking auth state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
              {forgotPassword ? 'Reset Password' : isLogin ? '' : 'Create Account'}
            </span>
          </h1>
        </div>

        <div className="glass-card glass-card-glow p-6 md:p-8">
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
                    minLength={6}
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
                {!isLogin && password.length > 0 && <PasswordStrength password={password} />}
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

        <div className="mt-8 mb-12 text-center">
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
