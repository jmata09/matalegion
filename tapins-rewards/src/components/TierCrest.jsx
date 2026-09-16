// One shield silhouette across all four tiers so the set reads as a ladder.
// The escalation stays inside the brand's two spot colours: an unearned cream
// badge, then yellow, then green, then the deep green jacket in yellow trim.

const SHIELD = 'M32 3 L59 12 V41 C59 59 46 72 32 78 C18 72 5 59 5 41 V12 Z'
const GREEN = '#007A53'
const DEEP = '#00432D'
const YELLOW = '#FFCD00'
const CREAM = '#EDE8DA'

function Rookie() {
  return (
    <g>
      <path d={SHIELD} fill={CREAM} stroke={GREEN} strokeWidth="2.5" />
      {/* A ball on a tee. Nothing earned yet, so the badge stays unfilled. */}
      <circle cx="32" cy="31" r="8" fill="none" stroke={GREEN} strokeWidth="2.5" />
      <path d="M32 41 L27 55 H37 Z" fill={GREEN} opacity="0.9" />
      <rect x="21" y="57" width="22" height="3" rx="1.5" fill={GREEN} opacity="0.55" />
    </g>
  )
}

function Member() {
  return (
    <g>
      <path d={SHIELD} fill={YELLOW} stroke={GREEN} strokeWidth="2.5" />
      <path
        d={SHIELD}
        fill="none"
        stroke={GREEN}
        strokeWidth="1.2"
        opacity="0.45"
        transform="translate(32 40) scale(0.85) translate(-32 -40)"
      />
      {/* Crossed putters. The blade heads carry the read, so they are drawn
          large and solid rather than as tapered tips. */}
      <path d="M24 20 L39 48" stroke={GREEN} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M40 20 L25 48" stroke={GREEN} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M24 20 L27 26" stroke={GREEN} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M40 20 L37 26" stroke={GREEN} strokeWidth="5.5" strokeLinecap="round" />
      <rect x="33" y="46" width="17" height="6.5" rx="2.5" fill={GREEN} transform="rotate(24 41 49)" />
      <rect x="14" y="46" width="17" height="6.5" rx="2.5" fill={GREEN} transform="rotate(-24 23 49)" />
    </g>
  )
}

function Circle() {
  return (
    <g>
      <path d={SHIELD} fill={GREEN} />
      <path d={SHIELD} fill="none" stroke={YELLOW} strokeWidth="2.5" />
      <path
        d={SHIELD}
        fill="none"
        stroke={YELLOW}
        strokeWidth="1.1"
        opacity="0.5"
        transform="translate(32 40) scale(0.85) translate(-32 -40)"
      />
      {/* The circle the tier is named for, with the pin in the cup. */}
      <circle cx="32" cy="39" r="16" fill="none" stroke={YELLOW} strokeWidth="1.6" opacity="0.6" />
      <path d="M29 24 V55" stroke={YELLOW} strokeWidth="2.8" strokeLinecap="round" />
      <path d="M30.5 25 L45 30.5 L30.5 36 Z" fill={YELLOW} />
      <ellipse cx="29" cy="56" rx="9" ry="3" fill={YELLOW} opacity="0.45" />
    </g>
  )
}

function Jacket() {
  return (
    <g>
      <path d={SHIELD} fill={DEEP} />
      <path d={SHIELD} fill="none" stroke={YELLOW} strokeWidth="3" />
      {/* The jacket: two lapels over a single button. The lapels are lifted
          well clear of the shield colour so the V reads at badge size. */}
      <path d="M32 20 L18 32 L21 62 H32 Z" fill="#12A472" />
      <path d="M32 20 L46 32 L43 62 H32 Z" fill="#0A7D55" />
      <path d="M32 20 L18 32 L21 62" fill="none" stroke={YELLOW} strokeWidth="2" />
      <path d="M32 20 L46 32 L43 62" fill="none" stroke={YELLOW} strokeWidth="2" />
      <path d="M32 20 V62" stroke={DEEP} strokeWidth="2.4" opacity="0.7" />
      <circle cx="32" cy="46" r="4" fill={YELLOW} />
      <circle cx="32" cy="46" r="1.6" fill={DEEP} opacity="0.6" />
    </g>
  )
}

const SHAPES = { rookie: Rookie, member: Member, circle: Circle, jacket: Jacket }

export default function TierCrest({ tier, size = 64, locked = false, className = '' }) {
  const Shape = SHAPES[tier] ?? Rookie
  return (
    <svg
      viewBox="0 0 64 81"
      width={size}
      height={(size * 81) / 64}
      role="img"
      aria-label={`${tier} tier crest`}
      className={className}
      style={locked ? { filter: 'grayscale(1)', opacity: 0.4 } : undefined}
    >
      <Shape />
    </svg>
  )
}
