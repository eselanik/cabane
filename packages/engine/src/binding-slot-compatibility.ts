import { entityDomain } from "./binding-profile-contract";
import type {
  BindingSlotDescriptor,
  EntityBindingSlotSpec,
  EntityId,
  HomeAssistantRuntimeSnapshot,
  HomeBindingManifest,
} from "./types";

export const compatibleDeviceClass = (
  spec: EntityBindingSlotSpec,
  entityId: EntityId,
  runtime: HomeAssistantRuntimeSnapshot,
) => {
  if (!spec.compatibleDeviceClasses?.length) return true;
  const deviceClass = runtime.entityStates[entityId]?.attributes.device_class;
  return typeof deviceClass === "string" && spec.compatibleDeviceClasses.includes(deviceClass);
};

export const isOpeningContactEntity = (entityId: EntityId, runtime: HomeAssistantRuntimeSnapshot) =>
  entityDomain(entityId) === "binary_sensor" &&
  ["door", "window", "opening", "garage_door"].includes(
    String(runtime.entityStates[entityId]?.attributes.device_class),
  );

/** Manual alternatives preserve the modeled function; automatic matching stays exact. */
const MANUAL_DOMAIN_ALTERNATIVES: Readonly<Record<string, readonly string[]>> = {
  light: ["switch"],
};

export const bindingDomainMatchRank = (spec: EntityBindingSlotSpec, domain: string): number => {
  if (spec.compatibleDomains.includes(domain as never)) return 0;
  return spec.compatibleDomains.some((expected) =>
    MANUAL_DOMAIN_ALTERNATIVES[expected]?.includes(domain),
  )
    ? 1
    : 2; // Modified: any other entity type may be connected manually (automatic matching uses rank 0 only).
};

export const entityMatchesBindingSlot = (
  descriptor: BindingSlotDescriptor,
  entityId: EntityId,
  runtime: HomeAssistantRuntimeSnapshot,
) =>
  bindingDomainMatchRank(descriptor.spec, entityDomain(entityId)) >= 0 &&
  (descriptor.kind === "opening-contact"
    ? isOpeningContactEntity(entityId, runtime)
    : compatibleDeviceClass(descriptor.spec, entityId, runtime));

const SHAREABLE_CAMERA_MODEL_IDS = new Set([
  "camera-screen",
  "connected-frame-oak",
  "connected-frame-black",
]);

export const isShareableCameraSlot = (
  modelId: string | undefined,
  slot: EntityBindingSlotSpec | undefined,
) =>
  Boolean(
    slot &&
    modelId &&
    SHAREABLE_CAMERA_MODEL_IDS.has(modelId) &&
    slot.compatibleDomains.length === 1 &&
    slot.compatibleDomains[0] === "camera",
  );

export const isShareableCameraDescriptor = (descriptor: BindingSlotDescriptor | undefined) =>
  Boolean(
    descriptor &&
    descriptor.kind === "device" &&
    isShareableCameraSlot(descriptor.deviceModel, descriptor.spec),
  );

/** Modified: any connection may use an entity from any Home Assistant area. */
export const allowsCrossAreaEntityBinding = (
  _manifest: HomeBindingManifest,
  _descriptor: BindingSlotDescriptor | undefined,
) => true;

export const allowsCrossAreaEntityBindingUpstream = (
  manifest: HomeBindingManifest,
  descriptor: BindingSlotDescriptor | undefined,
) => {
  if (descriptor?.kind === "opening-contact" || descriptor?.kind === "opening-cover") return true;
  if (!descriptor || descriptor.kind !== "device") return false;
  if (isShareableCameraDescriptor(descriptor)) return true;
  return (
    manifest.floors
      .flatMap((floor) => floor.rooms)
      .some((room) =>
        room.devices.some(
          (device) => device.id === descriptor.deviceSlotId && device.entitySlots.length === 1,
        ),
      ) ?? false
  );
};
