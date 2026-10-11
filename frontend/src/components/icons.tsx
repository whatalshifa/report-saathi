import type { ReactNode, SVGProps } from "react";

/**
 * ReportSaathi's own icon set: soft duotone drawings. Each icon is a filled, rounded "blob" in a light tint
 * (sat a hair off-register, like a sticker), under a 2px outline with round ends in the text colour.
 *
 * The tint is `--duo` when a container sets it (the sidebar, the buttons), otherwise a light wash of the
 * outline's own colour. Icons are decoration: pass `aria-hidden`, or an `aria-label` when one stands alone.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { strokeWidth?: number };
export type IconComponent = (props: IconProps) => ReactNode;

function icon(name: string, tint: ReactNode, line: ReactNode): IconComponent {
  function Icon({ className = "h-5 w-5", strokeWidth = 2, ...rest }: IconProps) {
    const labelled = rest["aria-label"] !== undefined;
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        role={labelled ? "img" : undefined}
        className={`rs-icon ${className}`}
        {...rest}
      >
        <g className="rs-duo" stroke="none">
          {tint}
        </g>
        {line}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

/* Arrows: a soft dot sits under the arrow head, like a thumb pressing it along. */
export const IconArrowRight = icon(
  "IconArrowRight",
  <circle cx="16" cy="13" r="5.5" />,
  <path d="M4.5 12h14m-5.5-6 6 6-6 6" />,
);
export const IconArrowUpRight = icon(
  "IconArrowUpRight",
  <circle cx="15" cy="10" r="5.5" />,
  <path d="M7 17 17 7m-8.5 0H17v8.5" />,
);
export const IconArrowDownRight = icon(
  "IconArrowDownRight",
  <circle cx="15" cy="15" r="5.5" />,
  <path d="M7 7l10 10m0-8.5V17H8.5" />,
);
export const IconArrowUp = icon(
  "IconArrowUp",
  <circle cx="13" cy="9" r="5.5" />,
  <path d="M12 19.5v-14m-6 5.5 6-6 6 6" />,
);
export const IconArrowDown = icon(
  "IconArrowDown",
  <circle cx="13" cy="15" r="5.5" />,
  <path d="M12 4.5v14m-6-5.5 6 6 6-6" />,
);
export const IconChevronRight = icon(
  "IconChevronRight",
  <circle cx="13" cy="13" r="7" />,
  <path d="m10 6.5 5.5 5.5-5.5 5.5" />,
);
export const IconChevronLeft = icon(
  "IconChevronLeft",
  <circle cx="11.5" cy="13" r="7" />,
  <path d="M14 6.5 8.5 12l5.5 5.5" />,
);

export const IconChevronDown = icon(
  "IconChevronDown",
  <circle cx="13" cy="13.5" r="7" />,
  <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
);

/* Things in the app */
export const IconReport = icon(
  "IconReport",
  <rect x="5.5" y="3.5" width="15" height="19" rx="3.5" />,
  <>
    <path d="M14 2.5H7.5a3 3 0 0 0-3 3v13a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3V8Z" />
    <path d="M14 2.5V6a2 2 0 0 0 2 2h3.5M8.5 13h7m-7 4h4.5" />
  </>,
);
export const IconFileSearch = icon(
  "IconFileSearch",
  <circle cx="13" cy="15" r="4.5" />,
  <>
    <path d="M19.5 9V8L14 2.5H7.5a3 3 0 0 0-3 3v13a3 3 0 0 0 3 3h3" />
    <path d="M14 2.5V6a2 2 0 0 0 2 2h3.5" />
    <circle cx="15.5" cy="15.5" r="3.5" />
    <path d="m18.2 18.2 2.3 2.3" />
  </>,
);
export const IconTimeline = icon(
  "IconTimeline",
  <path d="M12.8 21.3s-8.3-4.9-8.3-11A4.8 4.8 0 0 1 12.8 7.6a4.8 4.8 0 0 1 8.3 2.7c0 6.1-8.3 11-8.3 11Z" />,
  <>
    <path d="M12 20s-8-4.8-8-10.6A4.6 4.6 0 0 1 12 6.5a4.6 4.6 0 0 1 8 2.9c0 1-.2 1.9-.6 2.8" />
    <path d="M2.5 13h4l1.8-3 3 6 1.8-3h2.4" />
  </>,
);
export const IconStethoscope = icon(
  "IconStethoscope",
  <circle cx="19" cy="10.5" r="4" />,
  <>
    <path d="M5 3H4v5.5a5 5 0 0 0 10 0V3h-1" />
    <path d="M9 13.5v1.5a5 5 0 0 0 10 0v-2.5" />
    <circle cx="19" cy="10.5" r="2" />
  </>,
);
export const IconDashboard = icon(
  "IconDashboard",
  <>
    <rect x="4" y="4" width="7.5" height="9" rx="2.5" />
    <rect x="13.5" y="12" width="7.5" height="9" rx="2.5" />
  </>,
  <>
    <rect x="3" y="3" width="7.5" height="9" rx="2.5" />
    <rect x="13.5" y="3" width="7.5" height="5.5" rx="2.5" />
    <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2.5" />
    <rect x="3" y="15" width="7.5" height="6" rx="2.5" />
  </>,
);
export const IconHome = icon(
  "IconHome",
  <path d="M5 11.5 12.5 5l7.5 6.5V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />,
  <>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
    <path d="M10 21v-5a2 2 0 0 1 4 0v5" />
  </>,
);
export const IconFamily = icon(
  "IconFamily",
  <>
    <circle cx="9.5" cy="8.5" r="4" />
    <path d="M3.5 21c0-3.6 2.7-6.5 6-6.5s6 2.9 6 6.5Z" />
  </>,
  <>
    <circle cx="9" cy="7.5" r="3.5" />
    <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
    <path d="M15.5 4.3a3.5 3.5 0 0 1 0 6.4M18 14c2 .9 3.5 3.2 3.5 6" />
  </>,
);
export const IconAddPerson = icon(
  "IconAddPerson",
  <>
    <circle cx="10" cy="8.5" r="4" />
    <path d="M4 21c0-3.6 2.7-6.5 6-6.5s6 2.9 6 6.5Z" />
  </>,
  <>
    <circle cx="9.5" cy="7.5" r="3.5" />
    <path d="M3 20c0-3.6 2.9-6.5 6.5-6.5 1.6 0 3 .5 4.2 1.5" />
    <path d="M19 13v6m-3-3h6" />
  </>,
);
export const IconBadge = icon(
  "IconBadge",
  <circle cx="12.5" cy="10" r="7" />,
  <>
    <circle cx="12" cy="9.5" r="6.5" />
    <path d="m9.3 9.6 1.9 1.9 3.6-3.7" />
    <path d="m8 15 -1.5 6.5L12 19l5.5 2.5L16 15" />
  </>,
);
export const IconRecheck = icon(
  "IconRecheck",
  <path d="M4 8.5a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3V11H4Z" />,
  <>
    <path d="M20 11V7.5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h5" />
    <path d="M8 2.5v4m7-4v4M3 10h8" />
    <circle cx="17" cy="17" r="4.5" />
    <path d="M17 15v2.2l1.4 1" />
  </>,
);
export const IconPrinter = icon(
  "IconPrinter",
  <rect x="3.5" y="9" width="18" height="9" rx="3" />,
  <>
    <path d="M7 9V4a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 17 4v5" />
    <path d="M7 17.5H5.5a2.5 2.5 0 0 1-2.5-2.5v-3.5A2.5 2.5 0 0 1 5.5 9h13a2.5 2.5 0 0 1 2.5 2.5V15a2.5 2.5 0 0 1-2.5 2.5H17" />
    <rect x="7" y="14" width="10" height="7.5" rx="1.5" />
  </>,
);
export const IconLink = icon(
  "IconLink",
  <rect x="2.5" y="8" width="11" height="9" rx="4.5" />,
  <>
    <path d="M9.5 16.5H7a4.5 4.5 0 0 1 0-9h2.5" />
    <path d="M14.5 7.5H17a4.5 4.5 0 0 1 0 9h-2.5" />
    <path d="M8 12h8" />
  </>,
);
export const IconQr = icon(
  "IconQr",
  <>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="3.5" width="7.5" height="7.5" rx="2" />
    <rect x="3.5" y="13.5" width="7.5" height="7.5" rx="2" />
  </>,
  <>
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <path d="M14 14h3v3m4-3v.01M14 21h.01M17.5 21H21v-3.5" />
  </>,
);
export const IconUpload = icon(
  "IconUpload",
  <path d="M3.5 15h17v3a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3Z" />,
  <>
    <path d="M3 14.5V17a3.5 3.5 0 0 0 3.5 3.5h11A3.5 3.5 0 0 0 21 17v-2.5" />
    <path d="M12 15V3.5M7 8l5-5 5 5" />
  </>,
);
export const IconDownload = icon(
  "IconDownload",
  <path d="M3.5 15h17v3a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3Z" />,
  <>
    <path d="M3 14.5V17a3.5 3.5 0 0 0 3.5 3.5h11A3.5 3.5 0 0 0 21 17v-2.5" />
    <path d="M12 3.5V15m-5-5 5 5 5-5" />
  </>,
);
export const IconTrendUp = icon(
  "IconTrendUp",
  <path d="M3 19 9 12.5l4 4L21 8v12H3Z" />,
  <path d="m3 17.5 6-6.5 4 4 8-8.5m-5.5 0H21v5.5" />,
);
export const IconTrash = icon(
  "IconTrash",
  <path d="M5.5 7.5h14l-1.2 12a2.5 2.5 0 0 1-2.5 2.2H9.2a2.5 2.5 0 0 1-2.5-2.2Z" />,
  <>
    <path d="M3.5 6.5h17M9 6.5V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5v2" />
    <path d="m5.5 6.5 1.1 12.3A2.5 2.5 0 0 0 9.1 21h5.8a2.5 2.5 0 0 0 2.5-2.2l1.1-12.3M10 11v5m4-5v5" />
  </>,
);
export const IconPencil = icon(
  "IconPencil",
  <path d="m15.5 4.5 4 4L9 19l-5 1.2L5.2 15Z" />,
  <>
    <path d="M17.6 3.4a2.1 2.1 0 0 1 3 3L8.5 18.5 3.5 20l1.5-5Z" />
    <path d="m15 6 3 3" />
  </>,
);
export const IconScan = icon(
  "IconScan",
  <circle cx="12" cy="12.5" r="5" />,
  <>
    <path d="M3 7.5V6a3 3 0 0 1 3-3h1.5m9 0H18a3 3 0 0 1 3 3v1.5m0 9V18a3 3 0 0 1-3 3h-1.5m-9 0H6a3 3 0 0 1-3-3v-1.5" />
    <circle cx="11.5" cy="11.5" r="3.5" />
    <path d="m14 14 2.5 2.5" />
  </>,
);
export const IconTap = icon(
  "IconTap",
  <path d="m10 9.5 11 4.2-4.6 1.8-1.8 4.7Z" />,
  <>
    <path d="m9 9 10.5 4-4.5 1.6-1.6 4.5Z" />
    <path d="M7 2.5v2.5M2.5 7H5m.3-3.7 1.6 1.6m5.3-.6-1.5 1.5M3.8 11.7l1.6-1.6" />
  </>,
);
export const IconLock = icon(
  "IconLock",
  <rect x="4.5" y="10.5" width="16" height="11" rx="3.5" />,
  <>
    <rect x="4" y="10" width="16" height="11" rx="3.5" />
    <path d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3M12 14.5v2.5" />
  </>,
);
export const IconSpeaker = icon(
  "IconSpeaker",
  <path d="M4 9.5h3.5L12.5 5v15l-5-4.5H4Z" />,
  <>
    <path d="M3 10a1.5 1.5 0 0 1 1.5-1.5H7L11.5 4.5v15L7 15.5H4.5A1.5 1.5 0 0 1 3 14Z" />
    <path d="M15.5 9a4.5 4.5 0 0 1 0 6m3-9a8.5 8.5 0 0 1 0 12" />
  </>,
);

/* Small marks */
export const IconPlus = icon(
  "IconPlus",
  <circle cx="12.5" cy="12.5" r="8.5" />,
  <path d="M12 6.5v11M6.5 12h11" />,
);
export const IconMinus = icon("IconMinus", <circle cx="12.5" cy="12.5" r="7" />, <path d="M6.5 12h11" />);
export const IconCheck = icon(
  "IconCheck",
  <circle cx="12.5" cy="12.5" r="8.5" />,
  <path d="m5.5 12.5 4.5 4.5 8.5-9.5" />,
);
export const IconCheckCircle = icon(
  "IconCheckCircle",
  <circle cx="12.8" cy="12.8" r="9" />,
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.3 12.2 2.6 2.6 5-5.3" />
  </>,
);
export const IconAlert = icon(
  "IconAlert",
  <path d="M11.3 5.2a2 2 0 0 1 3.4 0l7 12.2a2 2 0 0 1-1.7 3H6a2 2 0 0 1-1.7-3Z" />,
  <>
    <path d="M10.3 4.3a2 2 0 0 1 3.4 0l7.6 13.2a2 2 0 0 1-1.7 3H4.4a2 2 0 0 1-1.7-3Z" />
    <path d="M12 9.5v4m0 3.4v.1" />
  </>,
);
export const IconInfo = icon(
  "IconInfo",
  <circle cx="12.8" cy="12.8" r="9" />,
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5m0-8.4v.1" />
  </>,
);
export const IconClose = icon(
  "IconClose",
  <circle cx="12.5" cy="12.5" r="8.5" />,
  <path d="M7 7l10 10M17 7 7 17" />,
);
export const IconPause = icon(
  "IconPause",
  <circle cx="12.8" cy="12.8" r="9" />,
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 9.5v5m4-5v5" />
  </>,
);
export const IconStop = icon(
  "IconStop",
  <rect x="5.5" y="5.5" width="14" height="14" rx="4" />,
  <rect x="5" y="5" width="14" height="14" rx="4" />,
);
export const IconMore = icon(
  "IconMore",
  <rect x="2.5" y="8" width="20" height="9" rx="4.5" />,
  <>
    <circle cx="6" cy="12" r=".6" />
    <circle cx="12" cy="12" r=".6" />
    <circle cx="18" cy="12" r=".6" />
  </>,
);
export const IconExternal = icon(
  "IconExternal",
  <rect x="4" y="6" width="14" height="14" rx="3.5" />,
  <>
    <path d="M11 4.5H7a3.5 3.5 0 0 0-3.5 3.5v9A3.5 3.5 0 0 0 7 20.5h9a3.5 3.5 0 0 0 3.5-3.5v-4" />
    <path d="M14.5 3.5h6v6m0-6-9 9" />
  </>,
);

/* The theme switch */
export const IconSun = icon(
  "IconSun",
  <circle cx="12.6" cy="12.6" r="5" />,
  <>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v1.8m0 15.4v1.8M4.6 4.6l1.3 1.3m12.2 12.2 1.3 1.3M2.5 12h1.8m15.4 0h1.8M4.6 19.4l1.3-1.3M18.1 5.9l1.3-1.3" />
  </>,
);
export const IconMoon = icon(
  "IconMoon",
  <path d="M20.5 15A8.5 8.5 0 0 1 10 4.5a8.5 8.5 0 1 0 10.5 10.5Z" />,
  <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2Z" />,
);
