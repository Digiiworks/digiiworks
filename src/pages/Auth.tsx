import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (forgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Check your email', { description: 'Password reset link sent.' });
        setForgotPassword(false);
      } else if (isLogin) {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Check roles to redirect appropriately
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);
        const roles = rolesData?.map((r: any) => r.role) ?? [];
        if (roles.includes('admin') || roles.includes('editor')) {
          navigate('/admin');
        } else {
          navigate('/admin');
        }
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
        toast.success('Check your email', { description: 'Confirm your email to continue.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-overlay opacity-20" />
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
              </div>
            )}

            {isLogin && !forgotPassword && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <span className="font-mono text-xs text-muted-foreground">Remember me</span>
              </label>
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
            {!forgotPassword && (
              <button
                onClick={() => setForgotPassword(true)}
                className="block w-full font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            )}
            <button
              onClick={() => { setIsLogin(!isLogin); setForgotPassword(false); }}
              className="block w-full font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up as a client" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
