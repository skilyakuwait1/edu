/**
 * The app's mark: a graduation cap on a rounded indigo badge. Used inline
 * next to the wordmark (nav, login screens) and as the source for the
 * generated favicon — keep the icon simple enough to still read at 16px.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-brand" />
      <path
        d="M16 9L26 13.5L16 18L6 13.5L16 9Z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 15.7V20C10.5 20 12.5 22 16 22C19.5 22 21.5 20 21.5 20V15.7"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M26 13.5V18.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
