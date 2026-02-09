import { Link } from 'react-router-dom';
import { ArrowRight, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function CTASection() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center"
      >
        <h2 className="font-heading text-3xl font-bold md:text-4xl">
          Ready to get stronger?
        </h2>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          Start tracking your workouts today. It's free, forever.
        </p>

        {/* Divider */}
        <div className="my-8 h-px w-16 bg-border" />

        <Link to="/auth?signup=true">
          <Button size="lg" className="min-w-[200px]">
            Create Your Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.5 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 text-xs text-muted-foreground"
        >
          No subscriptions · Free forever · Offline-first
        </motion.p>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-6 flex items-center gap-2 text-muted-foreground">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Dumbbell className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium">Built for lifters, by lifters.</span>
      </div>
    </section>
  );
}
