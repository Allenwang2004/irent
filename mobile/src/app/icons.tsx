// Line icons drawn after the ones in iRent's app, so the simulated screens
// match the real ones. All use currentColor and a 24 x 24 box.

type IconProps = { className?: string };

function Svg({
  className,
  children,
  fill = "none",
  weight = 1.6,
}: IconProps & { children: React.ReactNode; fill?: string; weight?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const ChevronLeft = (p: IconProps) => (
  <Svg {...p} weight={2}>
    <path d="M15 4 7 12l8 8" />
  </Svg>
);

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
);

export const Close = (p: IconProps) => (
  <Svg {...p} weight={2}>
    <path d="M5 5l14 14M19 5 5 19" />
  </Svg>
);

export const Headset = (p: IconProps) => (
  <Svg {...p} weight={2}>
    <path d="M4.5 14v-2.5a7.5 7.5 0 0 1 15 0V14" />
    <rect x="3.5" y="13" width="3.5" height="6" rx="1.5" />
    <rect x="17" y="13" width="3.5" height="6" rx="1.5" />
    <path d="M18.75 19c0 1.5-1.5 2.5-4.25 2.5H13" />
  </Svg>
);

// Flash with a small "x": the light is off.
export const FlashOff = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <path d="M13.5 3 7 13h4.5l-1 8L17 11h-4.5l1-8Z" stroke="none" />
    <path d="M3 4.5l3 3M6 4.5l-3 3" fill="none" strokeWidth={1.4} />
  </Svg>
);

export const FlashOn = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <path d="M13.5 3 7 13h4.5l-1 8L17 11h-4.5l1-8Z" stroke="none" />
  </Svg>
);

export const Camera = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <path
      d="M8.5 5.5 9.8 3.5h4.4l1.3 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h3.5Z"
      stroke="none"
    />
    <circle cx="12" cy="12.5" r="3.6" fill="#fff" stroke="none" />
    <circle cx="12" cy="12.5" r="2.2" stroke="none" />
  </Svg>
);

export const Lock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7" />
    <path d="M12 14.5v2.5" />
  </Svg>
);

export const Pencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14.5 5.5 4 4L9 19H5v-4l9.5-9.5Z" />
  </Svg>
);

export const Navigate = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <path d="M20 4 4 11l7 2 2 7 7-16Z" stroke="none" />
  </Svg>
);

export const Info = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8v.01" />
  </Svg>
);

// A filled round check, as in iRent's confirm-pickup list.
export const CheckCircle = (p: IconProps) => (
  <svg viewBox="0 0 24 24" className={p.className} aria-hidden>
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="m7 12.3 3.3 3.2L17 9" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------------- in-use page

export const CarReport = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 16.5V13l1.8-4.2A2 2 0 0 1 7.6 7.5h8.8a2 2 0 0 1 1.8 1.3L20 13v3.5" />
    <path d="M3 13h18v3.5H3z" />
    <path d="M6 16.5V19M18 16.5V19M7 14.75h1M16 14.75h1" />
  </Svg>
);

export const PlayVideo = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
  </Svg>
);

export const SteeringWheel = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M3.8 10.5c2.6.8 5.4 1 8.2 1s5.6-.2 8.2-1M10.5 13.5 8 20M13.5 13.5 16 20" />
  </Svg>
);

export const Parking = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M10 16.5v-9h3a2.5 2.5 0 0 1 0 5h-3" />
  </Svg>
);

export const DoorCard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="3.5" width="11" height="17" rx="2" />
    <path d="M7 7.5h5M15 9.5h3.5a1.5 1.5 0 0 1 1.5 1.5v5" />
    <circle cx="9.5" cy="15" r="1.6" />
  </Svg>
);

export const PairDevice = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="6" width="10" height="12" rx="2.5" />
    <path d="M9.5 6 10 3h4l.5 3M9.5 18l.5 3h4l.5-3M12 9.5v3l1.5 1" />
  </Svg>
);

export const Contract = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5h8.5L18.5 7.5v13H6z" />
    <path d="M14 3.5V8h4.5M9 12h6.5M9 15h6.5M9 18h4" />
  </Svg>
);

export const DashCam = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 6.5 3.5 8M19 6.5 20.5 8" />
    <rect x="3.5" y="9" width="17" height="10" rx="2" />
    <text x="12" y="16.3" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" stroke="none">
      REC
    </text>
  </Svg>
);

// Hand holding a key: iRent's "start return".
export const ReturnCar = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="14.5" cy="5.5" r="2.5" />
    <path d="M14.5 8v6M14.5 11h2M14.5 13.5h1.5" />
    <path d="M3 15.5h3.5l3 1.8h3.2a1.3 1.3 0 0 1 0 2.6H9.5M12.8 19.9l5.7-2.6a1.4 1.4 0 0 1 1.7 2.1L15 22H8l-5-1.5" />
  </Svg>
);
