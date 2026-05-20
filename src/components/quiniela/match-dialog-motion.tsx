import type { ReactNode } from "react";
import { MotionConfig, motion } from "framer-motion";

type MatchDialogMotionProps = {
  children: ReactNode;
  className?: string;
  testId?: string;
};

export function MatchDialogMotion({
  children,
  className,
  testId,
}: MatchDialogMotionProps) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        data-testid={testId}
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          y: { duration: 1, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.4, ease: "easeOut" },
        }}
        className={className}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
