export default function ReceiptIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M7 3v18l2.5-1.5L12 21l2.5-1.5L17 21V3l-2.5 1.5L12 3 9.5 4.5 7 3Z"
      />
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.5 8h5M9.5 11h5M9.5 14h3" />
    </svg>
  );
}
