// Flat illustration of a car from the front-left corner, used on the
// "check the car" and in-use screens. Same drawing as the demo video
// (video/remotion/src/components/CarArt.tsx) and the photo guide outline.

const SCALE = 1.16;
const SHIFT = { x: -27, y: -32 };
const BODY = "M40 292 L36 222 L62 206 L104 158 L148 146 L238 152 L262 196 L268 282 L146 298 Z";

export function CarArt({ plate, className }: { plate?: string; className?: string }) {
  return (
    <svg viewBox="8 128 284 206" className={className} role="img" aria-label="車輛示意圖">
      <g transform={`translate(${SHIFT.x} ${SHIFT.y}) scale(${SCALE})`}>
        <ellipse cx={156} cy={300} rx={128} ry={10} fill="rgba(0,0,0,0.18)" />
        <path d={BODY} fill="#F7F7F5" stroke="#a3a39e" strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M142 192 L262 196 L268 282 L146 298 Z" fill="#E6E6E2" />
        <path d="M64 206 L104 160 L148 148 L136 190 Z" fill="#2B3440" />
        <path d="M150 150 L234 154 L252 190 L142 192 Z" fill="#36404C" />
        <path d="M196 152 L198 191" stroke="#E6E6E2" strokeWidth={4} />
        <path d="M38 224 L136 192 L142 296 L40 292 Z" fill="#EFEFEB" />
        <path d="M44 232 L72 224 L74 236 L46 244 Z" fill="#FFF8DA" stroke="#b9b9b4" strokeWidth={1} />
        <path d="M108 214 L132 207 L133 220 L110 226 Z" fill="#FFF8DA" stroke="#b9b9b4" strokeWidth={1} />
        <path d="M56 262 L126 252 L128 274 L58 282 Z" fill="#3a3a3a" />
        <rect x={58} y={248} width={52} height={20} fill="#fff" stroke="#333" strokeWidth={1.5} />
        {plate && (
          <text x={84} y={262.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#222" fontFamily="Arial">
            {plate}
          </text>
        )}
        <ellipse cx={168} cy={286} rx={18} ry={22} fill="#1d1d1d" />
        <ellipse cx={168} cy={286} rx={9} ry={11} fill="#8d8d8d" />
        <ellipse cx={243} cy={280} rx={15} ry={19} fill="#1d1d1d" />
        <ellipse cx={243} cy={280} rx={7.5} ry={9.5} fill="#8d8d8d" />
      </g>
    </svg>
  );
}
