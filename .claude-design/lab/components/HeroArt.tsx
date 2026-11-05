export type HeroTone = "dark" | "peach" | "leaf" | "spark";

/**
 * Dekorasi botani untuk hero card mengikuti PEDOMAN UI:
 * - dark : kartu gradient hijau tua — blob organik berlapis + siluet daun + sparkle
 * - peach: kartu terang peach — bukit hijau berlapis, bunga coral/pink, kecambah tersenyum
 * - leaf : kartu hijau muda — blob & daun sangat halus + titik pastel
 * - spark: aksen sparkle kecil untuk kartu yang sudah punya ilustrasi sendiri
 */
export function HeroArt({ tone }: { tone: HeroTone }) {
  if (tone === "dark") {
    return <span className="lab-hero-art lab-hero-art--dark" aria-hidden="true"><svg viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg">
      <path d="M240 170C186 170 148 150 137 112C129 83 141 54 166 41C184 32 210 29 240 32V170Z" fill="#4E8B5A" fillOpacity="0.22"/>
      <path d="M240 170C196 170 166 153 159 123C153 99 163 76 185 66C201 59 220 58 240 63V170Z" fill="#5E9B68" fillOpacity="0.34"/>
      <path d="M240 170C211 168 191 152 185 129C181 113 186 96 198 87C194 104 196 120 207 135C216 147 227 156 240 161Z" fill="#8FBB7E" fillOpacity="0.5"/>
      <path d="M240 170C221 164 211 149 212 131C213 119 220 109 229 106C225 118 225 131 232 143C236 152 239 157 240 158Z" fill="#A9CC8F" fillOpacity="0.55"/>
      <circle cx="122" cy="36" r="3" fill="#FFF7E8" fillOpacity="0.55"/>
      <circle cx="141" cy="22" r="2" fill="#FFF7E8" fillOpacity="0.4"/>
      <circle cx="106" cy="61" r="2" fill="#FFF7E8" fillOpacity="0.35"/>
      <path d="M133 47L134.6 51.4L139 53L134.6 54.6L133 59L131.4 54.6L127 53L131.4 51.4Z" fill="#F5D9A8" fillOpacity="0.6"/>
    </svg></span>;
  }
  if (tone === "peach") {
    return <span className="lab-hero-art lab-hero-art--peach" aria-hidden="true"><svg viewBox="0 0 230 150" xmlns="http://www.w3.org/2000/svg">
      <path d="M230 150C181 148 146 125 141 85C138 58 151 25 176 16C193 10 211 9 230 13V150Z" fill="#A3C585" fillOpacity="0.32"/>
      <path d="M230 150C193 150 166 132 161 102C157 78 171 47 195 39C206 35 218 35 230 39V150Z" fill="#7FB069" fillOpacity="0.42"/>
      <path d="M197 78Q195 60 197 46" stroke="#5E8B5A" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <g transform="translate(197,40)">
        <circle cy="-5.8" r="3.8" fill="#F2A48C"/><circle cx="5.5" cy="-1.8" r="3.8" fill="#F2A48C"/><circle cx="3.4" cy="4.7" r="3.8" fill="#F2A48C"/><circle cx="-3.4" cy="4.7" r="3.8" fill="#F2A48C"/><circle cx="-5.5" cy="-1.8" r="3.8" fill="#F2A48C"/>
        <circle r="3" fill="#F5D9A8"/>
      </g>
      <path d="M215 92Q214 80 215 72" stroke="#5E8B5A" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <g transform="translate(215,68) scale(0.72)">
        <circle cy="-5.8" r="3.8" fill="#E8A5B5"/><circle cx="5.5" cy="-1.8" r="3.8" fill="#E8A5B5"/><circle cx="3.4" cy="4.7" r="3.8" fill="#E8A5B5"/><circle cx="-3.4" cy="4.7" r="3.8" fill="#E8A5B5"/><circle cx="-5.5" cy="-1.8" r="3.8" fill="#E8A5B5"/>
        <circle r="3" fill="#F5D9A8"/>
      </g>
      <g transform="translate(163,98)">
        <path d="M0 0Q1.5 -10 0 -17" stroke="#5E8B5A" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <path d="M0 -12Q-9 -16 -12 -23Q-3 -20 0 -13Z" fill="#7FB069"/>
        <path d="M0 -14Q9 -18 12 -25Q3 -22 0 -15Z" fill="#A3C585"/>
        <ellipse cy="2" rx="7" ry="8" fill="#C4956A"/>
        <circle cx="-2.4" cy="0.6" r="0.9" fill="#4A3B2A"/><circle cx="2.4" cy="0.6" r="0.9" fill="#4A3B2A"/>
        <path d="M-2.2 3.6Q0 5.6 2.2 3.6" stroke="#4A3B2A" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
        <circle cx="-4.7" cy="3.5" r="1.1" fill="#E8A08A" fillOpacity="0.85"/><circle cx="4.7" cy="3.5" r="1.1" fill="#E8A08A" fillOpacity="0.85"/>
      </g>
      <circle cx="142" cy="30" r="2.2" fill="#F2A48C" fillOpacity="0.55"/>
      <circle cx="154" cy="17" r="1.6" fill="#F5D9A8" fillOpacity="0.6"/>
    </svg></span>;
  }
  if (tone === "leaf") {
    return <span className="lab-hero-art lab-hero-art--leaf" aria-hidden="true"><svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <path d="M200 150C160 148 132 132 126 104C121 80 133 58 156 50C171 45 186 46 200 51V150Z" fill="#5E8B5A" fillOpacity="0.13"/>
      <path d="M200 150C171 148 150 132 146 108C143 89 154 72 172 66C182 63 191 64 200 69V150Z" fill="#5E8B5A" fillOpacity="0.19"/>
      <path d="M200 150C178 144 166 128 167 110C168 96 176 85 188 82C184 95 185 110 192 124C196 132 199 137 200 139Z" fill="#7FB069" fillOpacity="0.42"/>
      <path d="M200 150C188 142 184 128 189 116C192 109 198 105 200 104Z" fill="#A3C585" fillOpacity="0.5"/>
      <circle cx="130" cy="40" r="2.5" fill="#7FB069" fillOpacity="0.38"/>
      <circle cx="146" cy="28" r="1.8" fill="#A3C585" fillOpacity="0.5"/>
      <circle cx="118" cy="62" r="2" fill="#F2A48C" fillOpacity="0.42"/>
    </svg></span>;
  }
  return <span className="lab-hero-art lab-hero-art--spark" aria-hidden="true"><svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    <path d="M84 18L86 24L92 26L86 28L84 34L82 28L76 26L82 24Z" fill="#F5D9A8" fillOpacity="0.75"/>
    <path d="M104 44L105.4 48.6L110 50L105.4 51.4L104 56L102.6 51.4L98 50L102.6 48.6Z" fill="#F2A48C" fillOpacity="0.7"/>
    <circle cx="70" cy="52" r="3" fill="#A3C585" fillOpacity="0.6"/>
    <circle cx="96" cy="12" r="2.2" fill="#A3C585" fillOpacity="0.5"/>
    <circle cx="62" cy="24" r="2" fill="#F2A48C" fillOpacity="0.5"/>
    <circle cx="110" cy="66" r="2.6" fill="#A3C585" fillOpacity="0.45"/>
  </svg></span>;
}
