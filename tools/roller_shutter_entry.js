	"roller-shutter": {DEFINE}({
		defaultRoomType: "living-room",
		component: __eliRollerShutter,
		label: "Roller shutter",
		category: "Covers",
		defaultSize: __eliRsSize,
		resizePolicy: {
			kind: "axes",
			axes: ["width", "height"]
		},
		preferredPlacement: "wall",
		windowFit: {
			openingWidthRatio: 1.12 / 1.2,
			openingHeightRatio: 1.42 / 1.6,
			depthOffsetMeters: .003,
			openingTypes: ["window", "sliding-glass-door"]
		},
		supportedDomains: ["cover"],
		mountKind: "wall",
		bounds: {
			min: [-.6, 0, 0],
			max: [.6, 1.6, .14]
		},
		outlineContact: !0,
		interaction: {INTERACTION},
		complexity: {
			visibleMeshes: 28,
			triangles: 340
		}
	}),
