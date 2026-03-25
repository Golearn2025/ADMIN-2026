interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        group relative flex-1 flex items-center justify-center gap-2 
        px-3 py-2.5 rounded-xl 
        bg-[#101824] 
        border border-gray-800/50 

        transition-all duration-300 ease-out

        hover:bg-[#151c2b]
        hover:border-[#D6B25E]/60
        hover:shadow-[0_0_20px_rgba(214,178,94,0.25)]
        hover:-translate-y-[1px]

        active:scale-[0.97]
      "
    >
      {icon}

      <span className="text-xs text-gray-300 group-hover:text-white transition-all duration-300">
        {label}
      </span>

      <div className="
        absolute inset-0 rounded-xl 
        bg-gradient-to-r from-transparent via-[#D6B25E]/5 to-transparent 
        opacity-0 group-hover:opacity-100
        transition-opacity duration-500
      "/>
    </button>
  );
}
