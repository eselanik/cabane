import type {
  DeviceModelRegistry,
  FurnishingModelRegistry,
  ProjectModelRegistries,
} from "../types";
import type { HomeProject } from "../home-project/types";
import { ImportedModelGeometry } from "./ImportedModel";
import type { CustomModel } from "./contracts";

const resolved = new WeakMap<readonly CustomModel[], ProjectModelRegistries>();
const empty: readonly CustomModel[] = [];

export function resolveProjectModels(
  project: Pick<HomeProject, "customModels">,
  native: ProjectModelRegistries,
): ProjectModelRegistries {
  const models = project.customModels ?? empty;
  if (!models.length) return native;
  let custom = resolved.get(models);
  if (!custom) {
    const furnishings: Record<string, FurnishingModelRegistry[string]> = Object.create(
      null,
    ) as Record<string, never>;
    const devices: Record<string, DeviceModelRegistry[string]> = Object.create(null) as Record<
      string,
      never
    >;
    for (const model of models) {
      const descriptor = {
        label: model.name,
        category: "My models",
        defaultRoomType: "living-room" as const,
        defaultSize: model.normalization.size,
        bounds: model.normalization.bounds,
        resizePolicy: { kind: "axes" as const, axes: ["width", "height", "depth"] as const }, // Modified: free resizing
        preferredPlacement: model.placement === "floor" ? ("absolute" as const) : model.placement,
        outlineContact: false,
        complexity: model.complexity,
      };
      if (model.profile === "furniture") {
        furnishings[model.id] = {
          ...descriptor,
          component: ({ size }) => <ImportedModelGeometry model={model} size={size} />,
        };
      } else {
        devices[model.id] = {
          ...descriptor,
          // Modified: Cover models receive their entity state so a "cover-curtain" part can move.
          component: (props) => (
            <ImportedModelGeometry
              model={model}
              coverState={model.profile === "cover" ? props.state : undefined}
              coverVisual={props.visualState}
              reducedMotion={props.reducedMotion}
            />
          ),
          mountKind: model.placement === "wall" ? "wall" : "surface",
          supportedDomains: [model.profile],
          ...(model.profile === "light" && model.light ? { sceneLight: model.light } : {}),
          ...(model.profile === "camera"
            ? { liveMedia: { kind: "camera-stream" as const, slotRole: "primary" as const } }
            : {}),
          interaction: {
            ...(model.profile === "camera" ? { target: "camera-viewer" as const } : {}),
            tapTolerancePixels: 8,
          },
        };
      }
    }
    custom = { furnishingModels: furnishings, deviceModels: devices };
    resolved.set(models, custom);
  }
  return {
    furnishingModels: { ...native.furnishingModels, ...custom.furnishingModels },
    deviceModels: { ...native.deviceModels, ...custom.deviceModels },
  };
}
