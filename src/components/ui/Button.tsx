import React from 'react';

export type ButtonVariant =
  | 'green'
  | 'blue'
  | 'purple'
  | 'amber'
  | 'cyan'
  | 'teal'
  | 'indigo'
  | 'rose'
  | 'gray';

const baseClasses =
  'text-white font-semibold rounded-lg border-2 inline-flex items-center justify-center transition-colors transition-shadow duration-200 ' +
  'shadow-md hover:shadow-lg active:translate-y-px ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const variantMap: Record<ButtonVariant, { bg: string; hover: string; border: string }> = {
  green: { bg: 'bg-green-600 bg-gradient-to-b from-green-600 to-green-700', hover: 'hover:bg-green-700 hover:from-green-500 hover:to-green-700', border: 'border-green-400' },
  blue: { bg: 'bg-blue-600 bg-gradient-to-b from-blue-600 to-blue-700', hover: 'hover:bg-blue-700 hover:from-blue-500 hover:to-blue-700', border: 'border-blue-400' },
  purple: { bg: 'bg-purple-600 bg-gradient-to-b from-purple-600 to-purple-700', hover: 'hover:bg-purple-700 hover:from-purple-500 hover:to-purple-700', border: 'border-purple-400' },
  amber: { bg: 'bg-amber-600 bg-gradient-to-b from-amber-600 to-amber-700', hover: 'hover:bg-amber-700 hover:from-amber-500 hover:to-amber-700', border: 'border-amber-400' },
  cyan: { bg: 'bg-cyan-600 bg-gradient-to-b from-cyan-600 to-cyan-700', hover: 'hover:bg-cyan-700 hover:from-cyan-500 hover:to-cyan-700', border: 'border-cyan-400' },
  teal: { bg: 'bg-teal-600 bg-gradient-to-b from-teal-600 to-teal-700', hover: 'hover:bg-teal-700 hover:from-teal-500 hover:to-teal-700', border: 'border-teal-400' },
  indigo: { bg: 'bg-indigo-600 bg-gradient-to-b from-indigo-600 to-indigo-700', hover: 'hover:bg-indigo-700 hover:from-indigo-500 hover:to-indigo-700', border: 'border-indigo-400' },
  rose: { bg: 'bg-rose-600 bg-gradient-to-b from-rose-600 to-rose-700', hover: 'hover:bg-rose-700 hover:from-rose-500 hover:to-rose-700', border: 'border-rose-400' },
  gray: { bg: 'bg-gray-600 bg-gradient-to-b from-gray-600 to-gray-700', hover: 'hover:bg-gray-700 hover:from-gray-500 hover:to-gray-700', border: 'border-gray-400' },
};

export function buttonClasses(
  variant: ButtonVariant = 'gray',
  opts?: { disabled?: boolean; className?: string; padding?: 'sm' | 'md' | 'lg' }
) {
  const v = variantMap[variant] ?? variantMap.gray;
  const pad = opts?.padding === 'sm' ? 'py-1.5 px-3 text-sm' : opts?.padding === 'lg' ? 'py-4 px-8' : 'py-3 px-6';
  const disabled = opts?.disabled ? 'opacity-60 cursor-not-allowed' : '';
  const composed = [baseClasses, v.bg, v.hover, v.border, pad, disabled, opts?.className].filter(Boolean).join(' ');
  return composed;
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  padding?: 'sm' | 'md' | 'lg';
};

export const Button: React.FC<ButtonProps> = ({ variant = 'gray', padding = 'md', className, disabled, ...props }) => {
  return <button className={buttonClasses(variant, { disabled, className, padding })} disabled={disabled} {...props} />;
};

export default Button;
