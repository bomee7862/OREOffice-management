export default function PostBoxIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 10L12 4L20 10H4Z" fill="#F87171"/>
      <rect x="4" y="10" width="16" height="14" rx="2" fill="#FB7185"/>
      <rect x="8" y="14" width="8" height="1.8" rx="0.9" fill="white" opacity="0.85"/>
      <text x="12" y="22" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="bold" fontFamily="Arial, sans-serif">POST</text>
    </svg>
  );
}
