import { motion } from 'framer-motion'

/**
 * Centered auth card layout with subtle animated gradient background.
 * Used by Login and Register pages.
 */
export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 70%)`,
        }}
      />

      {/* Subtle grid lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-semibold gradient-text tracking-wide">
            Tengen
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Your private vault
          </p>
        </div>

        <div className="glass border border-border/50 rounded-xl p-8 shadow-2xl">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
