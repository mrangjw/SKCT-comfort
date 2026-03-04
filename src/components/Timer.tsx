interface Props {
  timeLeft: number;
  total: number;
}

export default function Timer({ timeLeft, total }: Props) {
  const pct = (timeLeft / total) * 100;
  const urgent = timeLeft <= 10;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-wrong' : 'bg-primary-light'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-sm font-mono min-w-[2.5rem] text-right ${urgent ? 'text-wrong animate-pulse' : 'text-text-dim'}`}>
        {timeLeft}s
      </span>
    </div>
  );
}
