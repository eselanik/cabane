import type { ReactNode } from "react";
import { bindingEntityCandidates } from "../runtime-binding-profile";
import type {
  BindingSlotDescriptor,
  HomeAssistantRuntimeSnapshot,
  RoomSpec,
  RuntimeBindingProfile,
} from "../types";
import {
  DeviceMappingRelationshipCard,
  type DeviceMappingActivationInput,
} from "./DeviceMappingRelationshipCard";

export function EntitySlotMappingRow({
  descriptor,
  room,
  profile,
  runtime,
  disabled,
  selected,
  onOpen,
  onTriggerElement,
  preview,
}: {
  descriptor: BindingSlotDescriptor;
  room: RoomSpec;
  profile: RuntimeBindingProfile;
  runtime: HomeAssistantRuntimeSnapshot;
  disabled: boolean;
  selected: boolean;
  onOpen: (input: DeviceMappingActivationInput) => void;
  onTriggerElement?: (element: HTMLButtonElement | null) => void;
  preview?: ReactNode;
}) {
  const current = profile.entityIdsBySlotId[descriptor.slotId];
  const candidates = bindingEntityCandidates({
    descriptor,
    roomId: room.id,
    profile,
    runtime,
    scope: "all-areas",
  });
  const currentCandidate = candidates.find((candidate) => candidate.entityId === current);
  return (
    <DeviceMappingRelationshipCard
      preview={preview}
      relationshipId={descriptor.slotId}
      domain={descriptor.spec.compatibleDomains[0] ?? "unknown"}
      connected={Boolean(currentCandidate)}
      label={descriptor.spec.presentation.label}
      targetLabel={
        currentCandidate?.label ?? (current ? "Saved match unavailable" : "Not connected")
      }
      disabled={disabled}
      selected={selected}
      onOpen={onOpen}
      onTriggerElement={onTriggerElement}
    />
  );
}
