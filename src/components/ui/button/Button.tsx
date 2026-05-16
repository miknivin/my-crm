import React, { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "outline";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  type = "button",
  onClick,
  className = "",
  disabled = false,
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-5 py-2.5 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:text-white",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300 dark:disabled:bg-gray-800 dark:disabled:text-gray-600",
  };

  // Combine classes, ensuring no extra whitespace
  const combinedClasses = [
    "inline-flex items-center justify-center font-medium gap-1 rounded-lg transition",
    sizeClasses[size],
    variantClasses[variant],
    disabled ? "cursor-not-allowed opacity-50" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <button
      className={combinedClasses}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      role="button"
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;