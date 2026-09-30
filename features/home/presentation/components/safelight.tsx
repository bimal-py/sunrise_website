import { SceneLight } from "./scene-light";

/**
 * "From the darkroom" is lit by a red safelight: a small black box on the
 * wall, its red filter glowing behind a bezel held by four screws, its cord
 * running up to the ceiling. Its light spills round it on the wall and tints
 * the room a dim red behind the drying line. The photos keep their own colours
 * (they hang in front of the wall, and a wedding photo turned red reads wrong).
 * Beside the scene's title card on the right; globals.css "Scene lights".
 */
export function Safelight() {
  return (
    <SceneLight className="safelight absolute inset-0 -z-10 overflow-hidden">
      <div className="safelight-wash lit" />
      <span className="safelight-cord" />
      <svg viewBox="0 0 40 36" className="safelight-box">
        <defs>
          <radialGradient id="safelight-glass" cx="50%" cy="45%" r="65%">
            <stop offset="0" stopColor="#ff6b52" />
            <stop offset="0.55" stopColor="#d6352a" />
            <stop offset="1" stopColor="#9c1e17" />
          </radialGradient>
        </defs>
        <rect className="safelight-grommet" x="17.5" y="-1.5" width="5" height="3" rx="1" />
        <rect className="safelight-body" x="0.5" y="0.5" width="39" height="35" rx="3" />
        <rect className="safelight-glass-off" x="5" y="5" width="30" height="26" rx="1.5" />
        <rect className="lit" x="5" y="5" width="30" height="26" rx="1.5" fill="url(#safelight-glass)" />
        <path className="safelight-reflection" d="M7.5 12.5 13 7.5M7.5 16.5 17 7.5" />
        {[
          [2.8, 2.8],
          [37.2, 2.8],
          [2.8, 33.2],
          [37.2, 33.2],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} className="safelight-screw" cx={cx} cy={cy} r="0.9" />
        ))}
      </svg>
    </SceneLight>
  );
}
