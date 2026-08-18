export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="balloon"
    >
      <circle cx="30" cy="25" r="18" fill="#df3b3b" />
      <path d="M30 43l-4 6h8z" fill="#b52828" />
      <path
        d="M30 49c1 7 8 5 5 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
