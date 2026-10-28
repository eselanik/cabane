//#region eli: built-in roller shutter (width and height resize independently; curtain follows the cover)
var __eliRsSize = [1.2, 1.6, 0.14], __eliRsTop = 1.42, __eliRsTravel = 1.38, __eliRsGrooves = Array.from({ length: 22 }, (_, i) => -0.03 - i * 0.062);
function __eliRsCurtain({ position: e, reducedMotion: t }) {
	let n = (0, {REACT}.useRef)(null), r = (0, {REACT}.useRef)(null), i = (0, {REACT}.useRef)((e ?? 0) / 100), a = (0, {REACT}.useRef)(i.current), o = {USETHREE}((e) => e.invalidate), s = (e) => {
		n.current && (n.current.scale.y = Math.max(1e-5, 1 - e), n.current.visible = e < .99999), r.current && (r.current.position.y = .02 + __eliRsTravel * e);
	};
	return (0, {REACT}.useLayoutEffect)(() => {
		a.current = e === null ? i.current : e / 100, t && (i.current = a.current), s(i.current), o();
	}, [e, t, o]), {USEFRAME}((e, t) => {
		let n = a.current - i.current;
		Math.abs(n) < 1e-4 || (i.current = Math.abs(n) < .001 ? a.current : i.current + n * (1 - Math.exp(-4 * Math.min(t, .1))), s(i.current), o());
	}), /* @__PURE__ */ (0, {JSX}.jsxs)("group", {
		name: "roller-shutter-moving-cover",
		children: [/* @__PURE__ */ (0, {JSX}.jsxs)("group", {
			ref: n,
			name: "roller-shutter-curtain",
			position: [0, __eliRsTop, .045],
			children: [/* @__PURE__ */ (0, {JSX}.jsxs)("mesh", {
				position: [0, -__eliRsTravel / 2, 0],
				castShadow: !0,
				receiveShadow: !0,
				children: [/* @__PURE__ */ (0, {JSX}.jsx)("boxGeometry", { args: [1.12, __eliRsTravel, .014] }), /* @__PURE__ */ (0, {JSX}.jsx)({TOON}, { color: "#53585d" })]
			}), ...__eliRsGrooves.map((y) => /* @__PURE__ */ (0, {JSX}.jsxs)("mesh", {
				position: [0, y, .008],
				children: [/* @__PURE__ */ (0, {JSX}.jsx)("boxGeometry", { args: [1.12, .007, .003] }), /* @__PURE__ */ (0, {JSX}.jsx)({TOON}, { color: "#33373a" })]
			}, y))]
		}), /* @__PURE__ */ (0, {JSX}.jsx)("group", {
			ref: r,
			name: "roller-shutter-bottom-bar",
			position: [0, .02, .045],
			children: /* @__PURE__ */ (0, {JSX}.jsxs)("mesh", {
				castShadow: !0,
				receiveShadow: !0,
				children: [
					/* @__PURE__ */ (0, {JSX}.jsx)("boxGeometry", { args: [1.12, .04, .03] }),
					/* @__PURE__ */ (0, {JSX}.jsx)({TOON}, { color: "#3a3d40" }),
					/* @__PURE__ */ (0, {JSX}.jsx)({OUTLINES}, { color: "#26292b", thickness: .0015, screenspace: !1 })
				]
			})
		})]
	});
}
function __eliRollerShutter({ state: e, visualState: t, reducedMotion: n }) {
	let r = t === "disconnected" || t === "unavailable" ? null : {COVERPOS}(e);
	return /* @__PURE__ */ (0, {JSX}.jsxs)("group", {
		name: "catalog-roller-shutter",
		children: [
			/* @__PURE__ */ (0, {JSX}.jsxs)("mesh", {
				name: "roller-shutter-box",
				position: [0, 1.51, .07],
				castShadow: !0,
				receiveShadow: !0,
				children: [
					/* @__PURE__ */ (0, {JSX}.jsx)("boxGeometry", { args: [1.2, .18, .14] }),
					/* @__PURE__ */ (0, {JSX}.jsx)({TOON}, { color: "#3a3d40" }),
					/* @__PURE__ */ (0, {JSX}.jsx)({OUTLINES}, { color: "#26292b", thickness: .0015, screenspace: !1 })
				]
			}),
			[-.58, .58].map((e) => /* @__PURE__ */ (0, {JSX}.jsxs)("mesh", {
				name: "roller-shutter-guide",
				position: [e, .71, .04],
				castShadow: !0,
				children: [/* @__PURE__ */ (0, {JSX}.jsx)("boxGeometry", { args: [.04, 1.42, .06] }), /* @__PURE__ */ (0, {JSX}.jsx)({TOON}, { color: "#3a3d40" })]
			}, e)),
			/* @__PURE__ */ (0, {JSX}.jsx)(__eliRsCurtain, { position: r, reducedMotion: n }),
			/* @__PURE__ */ (0, {JSX}.jsx)({BEACON}, { visualState: t, position: [.5, 1.51, .146], scale: .4 })
		]
	});
}
//#endregion
