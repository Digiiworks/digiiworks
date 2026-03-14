import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Also check URL hash as fallback (in case event already fired)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      navigate('/admin');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Password strength
  const checks = [
    { label: '6+ characters', pass: password.length >= 6 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special char', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['bg-destructive', 'bg-destructive', 'bg-orange-500', 'bg-neon-mint', 'bg-neon-mint'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!ready) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center space-y-4">
          <p className="font-mono text-muted-foreground">Invalid or expired reset link.</p>
          <Button onClick={() => navigate('/auth')} variant="outline" className="font-mono">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      
      <div className="relative mx-auto max-w-md px-6 py-16 md:py-24">
        <div className="mb-10 text-center">
          <Link to="/">
            <img src="/logo.svg" alt="Digiiworks" className="mx-auto mb-6" style={{ width: 160 }} />
          </Link>
          <h1 className="font-mono text-2xl font-bold">
            <span className="text-gradient">Set New Password</span>
          </h1>
        </div>
        <div className="glass-card glass-card-glow p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">New Password</Label>
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
              {password.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= score ? colors[score] : 'bg-muted'}`} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-[10px] ${score <= 1 ? 'text-destructive' : score <= 2 ? 'text-orange-500' : 'text-neon-mint'}`}>
                      {labels[score]}
                    </span>
                    <div className="flex gap-2">
                      {checks.map(c => (
                        <span key={c.label} className={`font-mono text-[10px] ${c.pass ? 'text-neon-mint' : 'text-muted-foreground'}`}>
                          {c.pass ? '✓' : '○'} {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Confirm Password</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`border-border bg-background/50 focus:border-primary/50 ${
                  confirmPassword.length > 0 && password !== confirmPassword ? 'border-destructive' : ''
                }`}
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="font-mono text-[10px] text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full font-mono glow-blue bg-primary text-primary-foreground"
              disabled={loading || (password !== confirmPassword)}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
