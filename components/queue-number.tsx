interface QueueNumberProps {
  number: number
  className?: string
}

export function QueueNumber({ number, className = "" }: QueueNumberProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium ${className}`}
    >
      {number}
    </div>
  )
}
