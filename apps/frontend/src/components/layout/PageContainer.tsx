import { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <main
      className={`flex-1 overflow-y-auto p-6 bg-[var(--color-surface)] ${className}`}
    >
      {children}
    </main>
  )
}
