'use client';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  variant?: 'default' | 'primary';
  onClick?: () => void;
}

export default function ModuleCard({
  title,
  description,
  icon,
  variant = 'default',
  onClick,
}: ModuleCardProps) {
  const baseClasses =
    'block p-6 rounded-xl border transition cursor-pointer';
  const variantClasses =
    variant === 'primary'
      ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm';

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} text-left w-full`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`
            flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
            ${variant === 'primary' ? 'bg-white/10' : 'bg-gray-100'}
          `}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className={`
              font-semibold mb-1
              ${variant === 'primary' ? 'text-white' : 'text-gray-900'}
            `}
          >
            {title}
          </h3>
          <p
            className={`
              text-sm
              ${variant === 'primary' ? 'text-gray-300' : 'text-gray-600'}
            `}
          >
            {description}
          </p>
        </div>
        <svg
          className={`
            flex-shrink-0 w-5 h-5
            ${variant === 'primary' ? 'text-white/60' : 'text-gray-400'}
          `}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  );
}

