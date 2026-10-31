import React from "react";

/** Line icons drawn on a 24px grid with a heavy stroke, to sit with the 2.5px rules. */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

type P = React.SVGProps<SVGSVGElement>;
const Svg = ({ children, ...p }: P) => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}>
    {children}
  </svg>
);

export const IconHelp = (p: P) => (
  <Svg {...p}>
    <path {...S} d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 14.5z" />
    <path {...S} d="M9.8 8.2a2.3 2.3 0 1 1 3.1 2.2c-.6.3-.9.7-.9 1.3" />
    <circle cx="12" cy="14.2" r="1.2" fill="currentColor" />
  </Svg>
);

export const IconLedger = (p: P) => (
  <Svg {...p}>
    <path {...S} d="M4 20h16M7 20v-6M12 20V6M17 20v-9" />
  </Svg>
);

export const IconDisplay = (p: P) => (
  <Svg {...p}>
    <rect {...S} x="3" y="4" width="18" height="12" rx="2" />
    <path {...S} d="M9 20h6M12 16v4" />
  </Svg>
);

export const IconSettings = (p: P) => (
  <Svg {...p}>
    <circle {...S} cx="12" cy="12" r="3" />
    <path
      {...S}
      d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"
    />
    <circle {...S} cx="12" cy="12" r="6.6" />
  </Svg>
);

export const IconBulb = (p: P) => (
  <Svg {...p}>
    <path {...S} d="M9 17h6M10 20.5h4M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.3V17h6v-1.9c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3z" />
  </Svg>
);

export const IconRestart = (p: P) => (
  <Svg {...p}>
    <path {...S} d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path {...S} d="M4 3.5v5h5" />
  </Svg>
);

export const IconFlag = (p: P) => (
  <Svg {...p}>
    <path {...S} d="M5 21V4M5 4h11l-2.5 4L16 12H5" />
  </Svg>
);

export const IconFolder = (p: P) => (
  <Svg {...p}>
    <path {...S} d="M3 7.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V9a1.5 1.5 0 0 0-1.5-1.5H11L9 5H4.5A1.5 1.5 0 0 0 3 6.5z" />
  </Svg>
);

export const IconBook = (p: P) => (
  <Svg {...p}>
    <path {...S} d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z" />
    <path {...S} d="M4 20a2 2 0 0 0 2 2h13v-4M8 7.5h7M8 11h5" />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect {...S} x="5" y="11" width="14" height="10" rx="2" />
    <path {...S} d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path {...S} strokeWidth={3.2} d="M5 5l14 14M19 5L5 19" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path {...S} strokeWidth={3.4} d="M4.5 12.5l5 5L19.5 7" />
  </Svg>
);

export const IconCaret = (p: P) => (
  <Svg {...p}>
    <path fill="currentColor" d="M3 7h18L12 18z" />
  </Svg>
);

export const IconGlobe = (p: P) => (
  <Svg {...p}>
    <circle {...S} cx="12" cy="12" r="9" />
    <path {...S} d="M3 12h18M12 3c2.6 2.4 3.8 5.4 3.8 9s-1.2 6.6-3.8 9c-2.6-2.4-3.8-5.4-3.8-9S9.4 5.4 12 3z" />
  </Svg>
);

export const IconFace = (p: P) => (
  <Svg {...p}>
    <rect {...S} x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path {...S} d="M9 9.5v1M15 9.5v1M8.5 15c2 1.6 5 1.6 7 0" />
  </Svg>
);
