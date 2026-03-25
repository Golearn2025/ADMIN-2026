interface StatusDotProps {
  color: "blue" | "green" | "yellow" | "red" | "gray";
  pulse?: boolean;
}

export function StatusDot({ color, pulse = false }: StatusDotProps) {
  const colors = {
    blue: "bg-blue-500 shadow-blue-500/50",
    green: "bg-green-500 shadow-green-500/50",
    yellow: "bg-yellow-500 shadow-yellow-500/50",
    red: "bg-red-500 shadow-red-500/50",
    gray: "bg-gray-500 shadow-gray-500/50",
  };

  return (
    <div
      className={`
        w-3 h-3 rounded-full 
        ${colors[color]} 
        shadow-md
        ${pulse ? "animate-pulse" : ""}
      `}
    />
  );
}
