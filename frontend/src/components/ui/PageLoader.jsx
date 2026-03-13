import { motion } from 'framer-motion'

const DOT = {
  initial: { y: 0, opacity: 0.4 },
  animate: { y: -8, opacity: 1 },
}

const TRANSITION = (i) => ({
  duration: 0.5,
  repeat: Infinity,
  repeatType: 'reverse',
  ease: 'easeInOut',
  delay: i * 0.15,
})

export function PageLoader({ className = 'h-40' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            variants={DOT}
            initial="initial"
            animate="animate"
            transition={TRANSITION(i)}
            className="w-2 h-2 rounded-full bg-primary"
          />
        ))}
      </div>
    </div>
  )
}
