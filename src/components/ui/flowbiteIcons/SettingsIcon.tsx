export default function SettingsIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M10.5 3.75a1.5 1.5 0 0 1 3 0v.19c0 .6.36 1.14.9 1.4.13.06.26.13.39.2.55.32 1.22.32 1.75-.02l.16-.1a1.5 1.5 0 0 1 2.06.55l.75 1.3a1.5 1.5 0 0 1-.55 2.05l-.16.1c-.53.31-.83.9-.8 1.52.01.15.01.3 0 .44-.03.62.27 1.21.8 1.52l.16.1a1.5 1.5 0 0 1 .55 2.05l-.75 1.3a1.5 1.5 0 0 1-2.06.55l-.16-.1a1.5 1.5 0 0 0-1.75-.02c-.13.07-.26.14-.39.2-.54.26-.9.8-.9 1.4v.19a1.5 1.5 0 0 1-3 0v-.19c0-.6-.36-1.14-.9-1.4a5.9 5.9 0 0 1-.39-.2 1.5 1.5 0 0 0-1.75.02l-.16.1a1.5 1.5 0 0 1-2.06-.55l-.75-1.3a1.5 1.5 0 0 1 .55-2.05l.16-.1c.53-.31.83-.9.8-1.52a5.6 5.6 0 0 1 0-.44c.03-.62-.27-1.21-.8-1.52l-.16-.1a1.5 1.5 0 0 1-.55-2.05l.75-1.3a1.5 1.5 0 0 1 2.06-.55l.16.1c.53.32 1.2.32 1.75 0 .13-.07.26-.14.39-.2.54-.26.9-.8.9-1.4v-.19Z"
      />
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
