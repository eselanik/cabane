//#region eli: animated covers for imported models
// An imported Cover model may contain a mesh named "cover-curtain" (origin at its top edge,
// geometry hanging downward) and optionally a node named "cover-rail" (the bottom bar).
// The curtain shrinks upward as the cover opens; the rail follows the curtain's lower edge.
function __eliCoverParts(root) {
	if (!root) return null;
	let curtain = null, rail = null;
	root.traverse((o) => {
		const n = String(o.name || "").toLowerCase();
		if (!curtain && n.includes("cover-curtain")) curtain = o;
		else if (!rail && n.includes("cover-rail")) rail = o;
	});
	if (!curtain) return null;
	let travel = 0;
	const mesh = curtain.isMesh ? curtain : null;
	if (mesh && mesh.geometry) {
		mesh.geometry.computeBoundingBox && mesh.geometry.computeBoundingBox();
		const b = mesh.geometry.boundingBox;
		if (b) travel = (b.max.y - b.min.y) * Math.abs(curtain.scale.y || 1);
	}
	return { curtain, rail, baseScaleY: curtain.scale.y || 1, railBaseY: rail ? rail.position.y : 0, travel };
}
function __eliApplyCover(parts, openness) {
	if (!parts) return;
	const o = Math.max(0, Math.min(1, openness));
	parts.curtain.scale.y = parts.baseScaleY * Math.max(1e-5, 1 - o);
	parts.curtain.visible = o < 0.99999;
	if (parts.rail) parts.rail.position.y = parts.railBaseY + parts.travel * o;
}
function __eliUseCover(root, state, visual, reduced, invalidate) {
	const parts = (0, {REACT}.useMemo)(() => __eliCoverParts(root), [root]);
	const current = (0, {REACT}.useRef)(null), target = (0, {REACT}.useRef)(null);
	const position = !parts || visual === "disconnected" || visual === "unavailable" ? null : {COVERPOS}(state);
	(0, {REACT}.useEffect)(() => {
		if (!parts) return;
		if (position === null) { if (current.current === null) return; target.current = current.current; return; }
		target.current = position / 100;
		if (current.current === null || reduced) current.current = target.current;
		__eliApplyCover(parts, current.current);
		invalidate();
	}, [parts, position, reduced, invalidate]);
	{USEFRAME}((_, delta) => {
		if (!parts || current.current === null || target.current === null) return;
		const diff = target.current - current.current;
		if (Math.abs(diff) < 1e-4) return;
		current.current = Math.abs(diff) < 1e-3 ? target.current : current.current + diff * (1 - Math.exp(-4 * Math.min(delta, 0.1)));
		__eliApplyCover(parts, current.current);
		invalidate();
	});
}
//#endregion
