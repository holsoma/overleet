import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const colours = {
  background: "#171b17",
  surface: "#20261f",
  text: "#f0f2e9",
  muted: "#a6aea1",
  rule: "#3a4237",
  lime: "#b9dc70",
};

export const sans = '"Segoe UI", Arial, sans-serif';
export const mono = 'Consolas, "Courier New", monospace';
export const easeOut = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
};

export const Frame = ({ children, chapter }: { children: ReactNode; chapter: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = (chapter === 0 ? 3 : 4) * fps;
  return (
    <AbsoluteFill style={{ backgroundColor: colours.background, color: colours.text, fontFamily: sans, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 144, top: 86, fontFamily: mono, fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>OVERLEET<span style={{ color: colours.lime }}> /</span></div>
      <div style={{ position: "absolute", right: 144, top: 92, color: colours.muted, fontSize: 25, letterSpacing: 2 }}>THINK IT THROUGH</div>
      {children}
      <div style={{ position: "absolute", left: 144, right: 144, bottom: 86, display: "flex", gap: 12 }}>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} style={{ height: 3, flex: 1, backgroundColor: colours.rule, position: "relative" }}>
            <div style={{ height: 3, backgroundColor: colours.lime, width: index < chapter ? "100%" : index > chapter ? "0%" : `${interpolate(frame, [0, durationInFrames - 1], [3, 100], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })}%` }} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Reveal = ({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: CSSProperties }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <div style={{ translate: interpolate(frame, [delay * fps, (delay + 0.6) * fps], ["0px 105%", "0px 0%"], easeOut) }}>{children}</div>
    </div>
  );
};

export const Arrow = ({ size = 58, colour = colours.lime }: { size?: number; colour?: string }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M10 32H52M34 14L52 32L34 50" stroke={colour} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);
