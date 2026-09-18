import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../utils/supabase';
import { Alert, Button, FieldLabel, Input, ThemeToggle, DashboardVeil } from '../components/ui';



const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen bg-canvas overflow-hidden">
      <DashboardVeil />
      {/* Left: the network itself. Hidden on small screens where it would
          only push the form below the fold. */}
      <aside className="relative hidden flex-1 overflow-hidden border-r border-line bg-surface-sunken/40 backdrop-blur-md lg:block">
        
        

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white dark:text-brand-950">
              <GraduationCap size={19} />
            </div>
            <div>
              <p className="text-sm leading-tight font-semibold tracking-tight text-ink">
                RNSIT Alumni
              </p>
              <p className="font-mono text-2xs leading-tight tracking-[0.14em] text-ink-muted">
                INTELLIGENCE
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl leading-[1.15] font-semibold tracking-tight text-balance text-ink xl:text-[2.5rem]"
            >
              Six thousand careers, one institutional memory.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 text-sm leading-relaxed text-ink-muted"
            >
              Search, verify and analyse the RNSIT alumni network — academic history and
              professional trajectory held against a single canonical record.
            </motion.p>

            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-8 flex gap-8 border-t border-line pt-6"
            >
              {[
                ['6,472', 'Alumni records'],
                ['34', 'Countries'],
                ['1,207', 'Employers'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="figure text-xl font-semibold text-ink">{value}</dt>
                  <dd className="mt-0.5 font-mono text-2xs tracking-wide text-ink-faint uppercase">
                    {label}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <p className="font-mono text-2xs tracking-wide text-ink-faint">
            RN SHETTY INSTITUTE OF TECHNOLOGY
          </p>
        </div>
      </aside>

      {/* Right: the form */}
      <main className="relative flex w-full flex-col justify-center px-5 py-12 sm:px-10 lg:w-[30rem] lg:shrink-0 xl:w-[34rem]">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-sm"
        >
          {/* Compact brand for small screens, where the panel is hidden */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white dark:text-brand-950">
              <GraduationCap size={19} />
            </div>
            <div>
              <p className="text-sm leading-tight font-semibold text-ink">RNSIT Alumni</p>
              <p className="font-mono text-2xs leading-tight tracking-[0.14em] text-ink-muted">
                INTELLIGENCE
              </p>
            </div>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Authorized institutional staff only.
          </p>

          {error && (
            <Alert tone="danger" className="mt-5" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form className="mt-7 space-y-4" onSubmit={handleLogin}>
            <div>
              <FieldLabel htmlFor="email-address">Email address</FieldLabel>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
                />
                <Input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                  placeholder="you@rnsit.ac.in"
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
                />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="mt-2 h-11 w-full"
              iconRight={!loading ? <ArrowRight size={16} /> : undefined}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 border-t border-line pt-5 text-2xs leading-relaxed text-ink-faint">
            Access is governed by row-level security. Your role determines which records and
            operations are available after sign-in.
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Login;




