import type { IconMap } from 'streamdown';

const iconProps = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.35, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Copy / check icons aligned with WebUI chrome (used by Streamdown code blocks). */
export const streamdownIcons: Partial<IconMap> = {
  CopyIcon: ({ size = 13, className, ...rest }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden
      {...rest}
    >
      <rect x="5.25" y="5.25" width="7.5" height="7.5" rx="1.25" {...iconProps} />
      <path d="M4.25 10.25h-.75a1 1 0 0 1-1-1v-6.5a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v.75" {...iconProps} />
    </svg>
  ),
  CheckIcon: ({ size = 13, className, ...rest }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden
      {...rest}
    >
      <path d="M3.5 8.25 6.5 11.25 12.5 4.75" {...iconProps} />
    </svg>
  ),
};
