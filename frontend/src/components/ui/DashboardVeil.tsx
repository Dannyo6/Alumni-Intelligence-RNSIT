import React from 'react';
import { useTheme } from '../../contexts/theme';
import DarkVeil from './DarkVeil';

/**
 * The single DarkVeil instance for the app, used as the Dashboard backdrop.
 *
 * Mounted by Layout into the main column only, so it never sits under the
 * sidebar. It is an absolute layer in a non-scrolling container, which keeps it
 * viewport-anchored while the content scrolls over it.
 *
 * Stack, bottom to top: canvas ground → DarkVeil → scrim → header/main content.
 *
 * The veil reads through the page's transparent regions — the page header block,
 * the outer padding and the gaps between cards. Cards themselves stay opaque, so
 * every figure, chart and table keeps a clean surface underneath it.
 */

// The CPPN ships a violet base palette. Rotating +27 degrees in YIQ lands it on
// the institutional royal blue this product already uses; +45 turns cyan and
// +15 stays purple, so this is a narrow window. Measured from a hue sweep of the
// real shader rather than picked by eye.
const HUE_SHIFT = 27;

interface DashboardVeilProps {
  className?: string;
}

export const DashboardVeil: React.FC<DashboardVeilProps> = () => {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Ground colour. The veil is opaque, so this only shows if WebGL fails. */}
      <div className="absolute inset-0 bg-canvas" />

      <div
        className={`absolute inset-0 ${dark ? 'opacity-70' : 'opacity-65'}`}
      >
        <DarkVeil
          hueShift={HUE_SHIFT}
          lightMode={!dark}
          speed={0.35}
          warpAmount={0.08}
          noiseIntensity={0.02}
          scanlineIntensity={0}
          scanlineFrequency={0}
          // The CPPN is evaluated per fragment and is the whole cost of this
          // component. The output is a soft field, so a 0.6 buffer upscales
          // with no visible loss and cuts fragment work to ~36%.
          resolutionScale={0.6}
        />
      </div>

      {/* Scrim. Weighted downward: the veil plume sits high, and the lower page
          is dense with cards that read better over a calmer ground. */}
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/25 via-canvas/45 to-canvas/75" />

      {/* Light mode only, and structural rather than taste: --ink-muted
          (#64748b) measures 4.65:1 on pure white, so the page-header
          description has ~3% headroom and any tint behind it fails 4.5:1. The
          text column is held at canvas white and the veil is given the right
          third, where nothing but the Refresh button (which carries its own
          surface) sits. Dark mode needs none of this — it clears 5.4:1. */}
      {!dark && (
        <div className="absolute inset-x-0 top-0 h-[340px] bg-gradient-to-r from-canvas from-[62%] to-transparent" />
      )}
    </div>
  );
};
