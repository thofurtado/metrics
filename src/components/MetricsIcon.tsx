export function MetricsIcon({ className = "", style = {} }: { className?: string, style?: any }) {
  return (
    <img 
      src="/favicon.svg" 
      className={className} 
      style={style} 
      alt="Metrics Logo" 
      loading="eager"
    />
  );
}
