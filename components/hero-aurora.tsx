/**
 * HeroAurora — Pure CSS animated gradient background.
 *
 * HYDRATION SAFE: No <style> tags, no inline JS animation, no dynamic values.
 * Keyframes live in app/globals.css (.aurora-blob-a / .aurora-blob-b).
 * This component renders identically on server and client — zero hydration risk.
 *
 * PERFORMANCE: CSS animations run entirely on the compositor thread.
 * Zero JS overhead, no requestAnimationFrame, no layout recalculation.
 */
export function HeroAurora() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Base color */}
      <div className="absolute inset-0 bg-[#050409]" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Aurora blobs — animated via globals.css, compositor-thread only */}
      <div className="absolute inset-0 mix-blend-screen">
        {/* Blob A: purple */}
        <div
          className="aurora-blob-a absolute rounded-full blur-[140px]"
          style={{
            width: '2200px',
            height: '2200px',
            top: '50%',
            left: '30%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(91,43,255,0.32) 0%, transparent 60%)',
            willChange: 'transform',
          }}
        />
        {/* Blob B: orange */}
        <div
          className="aurora-blob-b absolute rounded-full blur-[120px]"
          style={{
            width: '1600px',
            height: '1600px',
            top: '50%',
            left: '70%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255,77,0,0.18) 0%, transparent 60%)',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#000_100%)] opacity-30" />
    </div>
  );
}
