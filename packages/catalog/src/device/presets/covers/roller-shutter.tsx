import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { coverPosition, Outlines, ToonMaterial } from "@cabane/engine";
import type { HomeDeviceModelProps } from "@cabane/engine";
import { StatusBeacon } from "../../visuals/device-visual-state";

/** Exterior roller shutter: anthracite box, side guides and a slatted curtain. */
export const ROLLER_SHUTTER_SIZE = [1.2, 1.6, 0.14] as const;
const TOP = 1.42;
const TRAVEL = 1.38;
const GROOVES = Array.from({ length: 22 }, (_, index) => -0.03 - index * 0.062);

function ShutterCurtain({ position, reducedMotion }: { position: number | null; reducedMotion: boolean }) {
  const curtain = useRef<Group>(null);
  const bar = useRef<Group>(null);
  const current = useRef((position ?? 0) / 100);
  const target = useRef(current.current);
  const invalidate = useThree((state) => state.invalidate);
  const apply = (openness: number) => {
    if (curtain.current) {
      curtain.current.scale.y = Math.max(0.00001, 1 - openness);
      curtain.current.visible = openness < 0.99999;
    }
    if (bar.current) bar.current.position.y = 0.02 + TRAVEL * openness;
  };
  useLayoutEffect(() => {
    target.current = position === null ? current.current : position / 100;
    if (reducedMotion) current.current = target.current;
    apply(current.current);
    invalidate();
  }, [position, reducedMotion, invalidate]);
  useFrame((_, delta) => {
    const difference = target.current - current.current;
    if (Math.abs(difference) < 0.0001) return;
    current.current =
      Math.abs(difference) < 0.001
        ? target.current
        : current.current + difference * (1 - Math.exp(-4 * Math.min(delta, 0.1)));
    apply(current.current);
    invalidate();
  });
  return (
    <group name="roller-shutter-moving-cover">
      <group ref={curtain} name="roller-shutter-curtain" position={[0, TOP, 0.045]}>
        <mesh position={[0, -TRAVEL / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.12, TRAVEL, 0.014]} />
          <ToonMaterial color="#53585d" />
        </mesh>
        {GROOVES.map((y) => (
          <mesh key={y} position={[0, y, 0.008]}>
            <boxGeometry args={[1.12, 0.007, 0.003]} />
            <ToonMaterial color="#33373a" />
          </mesh>
        ))}
      </group>
      <group ref={bar} name="roller-shutter-bottom-bar" position={[0, 0.02, 0.045]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.12, 0.04, 0.03]} />
          <ToonMaterial color="#3a3d40" />
          <Outlines color="#26292b" thickness={0.0015} screenspace={false} />
        </mesh>
      </group>
    </group>
  );
}

export function RollerShutterModel({ state, visualState, reducedMotion }: HomeDeviceModelProps) {
  const position =
    visualState === "disconnected" || visualState === "unavailable" ? null : coverPosition(state);
  return (
    <group name="catalog-roller-shutter">
      <mesh name="roller-shutter-box" position={[0, 1.51, 0.07]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.18, 0.14]} />
        <ToonMaterial color="#3a3d40" />
        <Outlines color="#26292b" thickness={0.0015} screenspace={false} />
      </mesh>
      {[-0.58, 0.58].map((x) => (
        <mesh key={x} name="roller-shutter-guide" position={[x, 0.71, 0.04]} castShadow>
          <boxGeometry args={[0.04, 1.42, 0.06]} />
          <ToonMaterial color="#3a3d40" />
        </mesh>
      ))}
      <ShutterCurtain position={position} reducedMotion={reducedMotion} />
      <StatusBeacon visualState={visualState} position={[0.5, 1.51, 0.146]} scale={0.4} />
    </group>
  );
}
