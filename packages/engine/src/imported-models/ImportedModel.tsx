import { useModelLightingState } from "../model-lighting/ModelLightingSurface";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import type { Mesh, Object3D } from "three";
import { coverPosition } from "../cover-state";
import { ToonMaterial } from "../rendering";
import { acquireGlb, disposeGlbSkeletons } from "./glb-resources";
import type { CustomModel, ModelVector } from "./contracts";
import type { DeviceVisualState, EntityStateSnapshot } from "../types";
import { ImportedModelSurface } from "./ImportedModelSurface";

interface CoverParts {
  curtain: Object3D;
  rail: Object3D | null;
  baseScaleY: number;
  railBaseY: number;
  travel: number;
}

/** Modified: "cover-curtain" hangs from its origin and shrinks upward; "cover-rail" follows it. */
const coverParts = (root: Object3D | undefined): CoverParts | null => {
  if (!root) return null;
  let curtain: Object3D | null = null;
  let rail: Object3D | null = null;
  root.traverse((object) => {
    const name = object.name.toLowerCase();
    if (!curtain && name.includes("cover-curtain")) curtain = object;
    else if (!rail && name.includes("cover-rail")) rail = object;
  });
  if (!curtain) return null;
  const found = curtain as Object3D;
  let travel = 0;
  const mesh = found as Mesh;
  if (mesh.isMesh && mesh.geometry) {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (box) travel = (box.max.y - box.min.y) * Math.abs(found.scale.y || 1);
  }
  return {
    curtain: found,
    rail,
    baseScaleY: found.scale.y || 1,
    railBaseY: (rail as Object3D | null)?.position.y ?? 0,
    travel,
  };
};

const applyCover = (parts: CoverParts, openness: number) => {
  const open = Math.max(0, Math.min(1, openness));
  parts.curtain.scale.y = parts.baseScaleY * Math.max(1e-5, 1 - open);
  parts.curtain.visible = open < 0.99999;
  if (parts.rail) parts.rail.position.y = parts.railBaseY + parts.travel * open;
};

function useCoverAnimation(
  root: Object3D | undefined,
  state: EntityStateSnapshot | undefined,
  visual: DeviceVisualState | undefined,
  reducedMotion: boolean | undefined,
  invalidate: () => void,
) {
  const parts = useMemo(() => coverParts(root), [root]);
  const current = useRef<number | null>(null);
  const target = useRef<number | null>(null);
  const position =
    !parts || visual === "disconnected" || visual === "unavailable" ? null : coverPosition(state);
  useEffect(() => {
    if (!parts) return;
    if (position === null) {
      if (current.current !== null) target.current = current.current;
      return;
    }
    target.current = position / 100;
    if (current.current === null || reducedMotion) current.current = target.current;
    applyCover(parts, current.current);
    invalidate();
  }, [parts, position, reducedMotion, invalidate]);
  useFrame((_, delta) => {
    if (!parts || current.current === null || target.current === null) return;
    const difference = target.current - current.current;
    if (Math.abs(difference) < 1e-4) return;
    current.current =
      Math.abs(difference) < 1e-3
        ? target.current
        : current.current + difference * (1 - Math.exp(-4 * Math.min(delta, 0.1)));
    applyCover(parts, current.current);
    invalidate();
  });
}

export function ImportedModelGeometry({
  model,
  size = model.normalization.size,
  state,
  coverVisual,
  reducedMotion,
}: {
  model: CustomModel;
  size?: ModelVector;
  state?: EntityStateSnapshot | undefined;
  coverVisual?: DeviceVisualState | undefined;
  reducedMotion?: boolean | undefined;
}) {
  const lightingContext = useModelLightingState();
  const lightState = lightingContext ? lightingContext.state : state;
  const invalidate = useThree((state) => state.invalidate);
  const [loaded, setLoaded] = useState<{ root?: Object3D; error?: string }>({});
  useCoverAnimation(
    loaded.root,
    model.profile === "cover" ? state : undefined,
    coverVisual,
    reducedMotion,
    invalidate,
  );
  // Modified: each part of a floor model blocks walking on its own, so you can walk between them.
  if (loaded.root && model.placement === "floor" && !loaded.root.userData.walkPartsMarked) {
    loaded.root.userData.walkPartsMarked = true;
    loaded.root.traverse((object) => {
      if ((object as Mesh).isMesh) object.userData.walkCollider = true;
    });
  }
  const hash = model.asset.sha256,
    byteLength = model.asset.byteLength;
  useEffect(() => {
    let active = true;
    let instance: Object3D | undefined;
    setLoaded({});
    const lease = acquireGlb({ sha256: hash, byteLength });
    void lease.pending.then(
      ({ root }) => {
        if (active) {
          instance = clone(root);
          setLoaded({ root: instance });
          invalidate();
        }
      },
      (error: unknown) => {
        if (active) {
          setLoaded({ error: error instanceof Error ? error.message : "Unable to load GLB." });
          invalidate();
        }
      },
    );
    return () => {
      active = false;
      if (instance) disposeGlbSkeletons(instance);
      lease.release();
    };
  }, [hash, byteLength, invalidate]);
  const { normalization } = model;
  // Modified: stretch per axis so width, height and depth resize independently.
  const axisScale = size.map((value, axis) => value / normalization.size[axis]) as [
    number,
    number,
    number,
  ];
  const center = useMemo(
    () =>
      normalization.bounds.min.map((n, axis) => (n + normalization.bounds.max[axis]) / 2) as [
        number,
        number,
        number,
      ],
    [normalization],
  );
  return (
    <group
      scale={axisScale}
      userData={{
        importedModelId: model.id,
        ...(loaded.error ? { modelAssetError: loaded.error } : {}),
      }}
    >
      {loaded.root ? (
        <group position={normalization.offset}>
          <group rotation={normalization.rotation} scale={normalization.scale}>
            <ImportedModelSurface root={loaded.root} light={model.light} state={lightState} />
          </group>
        </group>
      ) : (
        <mesh
          name={loaded.error ? "missing-imported-model" : "loading-imported-model"}
          position={center}
        >
          <boxGeometry args={normalization.size} />
          <ToonMaterial color={loaded.error ? "#da8d59" : "#94a5ae"} wireframe />
        </mesh>
      )}
      {model.placement === "floor" && (
        <mesh visible={false} position={center}>
          <boxGeometry args={normalization.size} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
    </group>
  );
}
