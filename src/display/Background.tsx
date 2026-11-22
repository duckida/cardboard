import type { Background as BackgroundType } from '@shared/types';

export function Background({
  background,
  lite,
}: {
  background: BackgroundType;
  lite: boolean;
}) {
  if (background.type === 'solid') {
    return <div className="cb-bg" style={{ background: background.color }} />;
  }

  if (background.type === 'gradient') {
    return (
      <div
        className="cb-bg"
        style={{
          background: `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})`,
        }}
      />
    );
  }

  return (
    <div className="cb-bg cb-bg-image">
      <img
        src={background.url}
        alt=""
        style={{
          objectFit: background.fit,
          filter: background.blur && !lite ? `blur(${background.blur}px)` : undefined,
          transform: background.blur && !lite ? 'scale(1.06)' : undefined,
        }}
      />
      <div className="cb-bg-dim" style={{ opacity: background.dim }} />
    </div>
  );
}
