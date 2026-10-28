"""Apply Eli's Cabane modifications to an official Cabane HACS release folder.

Usage:  python3 patch_bundle.py /path/to/custom_components/cabane [--check]

Works on minified releases by discovering the renamed helper names with regexes first.
Every patch must match exactly the expected number of times; otherwise nothing is written.
Tested on v0.3.18 and v0.3.19.
"""
import hashlib, json, re, sys
from pathlib import Path

root = Path(sys.argv[1])
CHECK = "--check" in sys.argv
TOOLS = Path(__file__).parent
assets = root / "frontend/assets"
MAIN = next(assets.glob("LaserIcon-*.js")).name
CATALOG = next(assets.glob("ShortcutDeviceIcon-*.js")).name
src = {n: (assets / n).read_text(encoding="utf-8") for n in (MAIN, CATALOG)}
problems = []

def find(file, label, pattern, group=1):
    m = re.search(pattern, src[file])
    if not m:
        problems.append(f"name not found: {label}")
        return f"__missing_{label}__"
    return m.group(group)

I = r"[A-Za-z_$][\w$]*"
# ---------- names in the main engine bundle ----------
N = {}
m = re.search(rf"({I}) = \(e, t\) => e\.compatibleDomains\.includes\(t\) \? 0 : e\.compatibleDomains\.some\(\(e\) => ({I})\[e\]\?\.includes\(t\)\) \? 1 : -1", src[MAIN])
if m: N["RANK"], N["ALT"] = m.group(1), m.group(2)
else: problems.append("name not found: RANK")
m = re.search(rf"({I}) = \(e, t, n\) => {re.escape(N.get('RANK','?'))}\(e\.spec, ({I})\(t\)\) >= 0 && \(e\.kind === \"opening-contact\" \? ({I})\(t, n\) : ({I})\(e\.spec, t, n\)\)", src[MAIN])
if m: N["MATCH"], N["DOMAIN"], N["CONTACT"], N["DEVCLASS"] = m.groups()
else: problems.append("name not found: MATCH")
N["CROSSAREA"] = find(MAIN, "CROSSAREA", rf"({I}) = \(e, t\) => t\?\.kind === \"opening-contact\" \|\| t\?\.kind === \"opening-cover\" \? !0")
N["RESDOMAIN"] = find(MAIN, "RESDOMAIN", r"uses incompatible domain \"\$\{(\w+)\}\"")
N["COVERPOS"] = find(MAIN, "COVERPOS", rf"({I}) = \(e\) => \{{\n\tif \(!e \|\| !e\.available \|\| e\.stale \|\| !\[\n\t\t\"open\"")
N["USEFRAME"] = find(MAIN, "USEFRAME", rf"function ({I})\(e, t = 0\) \{{\n\tlet n = {I}\(\), r = n\.getState\(\)\.internal\.subscribe")
region = re.search(r"//#region packages/engine/src/imported-models/ImportedModel\.tsx\n(function (\w+)\(\{ model: e, size: t = e\.normalization\.size(?:, state: n)? \}\) \{\n\tlet ([^\n]*);\n)", src[MAIN])
if region:
    N["IMF"] = region.group(2)
    letline = region.group(3)
    mm = re.search(rf"({I}) = {I}\(\(e\) => e\.invalidate\), \[({I}), {I}\] = \(0, ({I})\.useState\)\(\{{\}}\)", letline)
    if mm: N["INV"], N["ROOTSTATE"], N["REACT"] = mm.groups()
    else: problems.append("name not found: imported-model locals")
    ms = re.search(rf"({I}) = {I} \? {I}\.state : n", letline)
    N["STATEVAR"] = ms.group(1) if ms else None
else:
    problems.append("name not found: ImportedModel region")

# ---------- names in the catalog bundle ----------
fab = re.search(r"//#region packages/catalog/src/device/presets/covers/blind-fabric\.tsx\n(.*?)//#endregion", src[CATALOG], re.S)
blind = re.search(r"//#region packages/catalog/src/device/presets/covers/motorized-blind\.tsx\n(.*?)//#endregion", src[CATALOG], re.S)
C = {}
if fab and blind:
    f, b = fab.group(1), blind.group(1)
    def g(label, pattern, text):
        mm = re.search(pattern, text)
        if not mm: problems.append(f"name not found: {label}"); return f"__missing_{label}__"
        return mm.group(1)
    C["REACT"] = g("C.REACT", rf"\(0, ({I})\.useRef\)", f)
    C["USETHREE"] = g("C.USETHREE", rf"= ({I})\(\(e\) => e\.invalidate\)", f)
    C["USEFRAME"] = g("C.USEFRAME", rf"\]\), ({I})\(\(e, t\) => \{{", f)
    C["JSX"] = g("C.JSX", rf"\(0, ({I})\.jsxs\)\(\"group\"", f)
    C["TOON"] = g("C.TOON", rf"\(0, {I}\.jsx\)\(({I}), \{{ color: \"#d9d4c6\" \}}\)", f)
    C["OUTLINES"] = g("C.OUTLINES", rf"\(0, {I}\.jsx\)\(({I}), \{{\n\t+color: \"#59605a\"", f)
    C["COVERPOS"] = g("C.COVERPOS", rf"t === \"unavailable\" \? null : ({I})\(e\);", b)
    C["BEACON"] = g("C.BEACON", rf"\(0, {I}\.jsx\)\(({I}), \{{\n\t+visualState: t,", b)
else:
    problems.append("name not found: blind regions")
mb = re.search(rf"\t\"motorized-blind\": ({I})\(\{{\n(.*?)\n\t\}}\),", src[CATALOG], re.S)
if mb:
    C["DEFINE"] = mb.group(1)
    mi = re.search(rf"interaction: ({I}),", mb.group(2))
    C["INTERACTION"] = mi.group(1) if mi else "__missing_INTERACTION__"
else:
    problems.append("name not found: motorized-blind registry entry")

def fill(text, names):
    for k, v in names.items():
        if v is not None: text = text.replace("{%s}" % k, v)
    return text

if problems and not CHECK:
    sys.exit("ABORT: " + "; ".join(problems))

R = re.escape
COVER_ANIM = fill((TOOLS / "cover_anim.js").read_text(encoding="utf-8"), {"REACT": N.get("REACT"), "COVERPOS": N.get("COVERPOS"), "USEFRAME": N.get("USEFRAME")})
ROLLER = fill((TOOLS / "roller_shutter.js").read_text(encoding="utf-8"), C)
ROLLER_ENTRY = fill((TOOLS / "roller_shutter_entry.js").read_text(encoding="utf-8"), C)
IMF = N.get("IMF", "?")
state_expr = f"({N['STATEVAR']} ?? __cs)" if N.get("STATEVAR") else "__cs"
hook = (f'\t__eliUseCover({N.get("ROOTSTATE","?")}.root, e.profile === "cover" ? {state_expr} : void 0, __cv, __rm, {N.get("INV","?")});\n'
        f'\t{N.get("ROOTSTATE","?")}.root && e.placement === "floor" && !{N.get("ROOTSTATE","?")}.root.userData.__eliWalkParts && '
        f'({N.get("ROOTSTATE","?")}.root.userData.__eliWalkParts = !0, {N.get("ROOTSTATE","?")}.root.traverse((o) => {{ o.isMesh && (o.userData.walkCollider = !0); }}));\n')

# (name, file, regex, replacement (str or callable), expected count)
PATCHES = [
  ("A1 pickers may search every area, even when the room has no area mapping", MAIN,
   R('&& (e.kind !== "opening-contact" && e.kind !== "opening-cover" || i !== "all-areas")) return [];'),
   '&& i !== "all-areas") return [];', 1),
  ("A2 entity pickers always list entities from all areas", MAIN,
   R('scope: e.kind === "opening-contact" || e.kind === "opening-cover" ? "all-areas" : "mapped-area"'), 'scope: "all-areas"', 2),
  ("A3 device pickers always list devices from all areas", MAIN,
   r'(\t\t\troomId: t,\n\t\t\tprofile: r,\n\t\t\truntime: i)(\n\t\t\}\)\.filter\(\(e\) => i\.entityRegistry\.find\(\(t\) => t\.entity_id === e\.entityId\)\?\.device_id === a\.id\))',
   r'\1,\n\t\t\tscope: "all-areas"\2', 1),
  ("A4 a connected entity from another area is not an error", MAIN,
   R(f'{N.get("CROSSAREA","?")} = (e, t) => t?.kind === "opening-contact"'), f'{N.get("CROSSAREA","?")} = (e, t) => !0 || t?.kind === "opening-contact"', 1),
  ("A5 connections are allowed in rooms without an HA area", MAIN,
   r'if \((\w+)\.length === 0 && (\w+)\.roomIds\.length > 0 && \2\.kind !== "opening-contact" && (\w+)\("profile\.room-unmapped"',
   r'if (!1 && \1.length === 0 && \2.roomIds.length > 0 && \2.kind !== "opening-contact" && \3("profile.room-unmapped"', 1),
  ("A6 show the HA area next to every entity in pickers", MAIN,
   R('label: `${t.label}${e.kind === "opening-contact" ? ` · ${t.areaLabel}` : ""}'), 'label: `${t.label} · ${t.areaLabel}', 1),
  ("B1 any entity type can be connected manually (automatic matching stays exact)", MAIN,
   R(f'e.compatibleDomains.some((e) => {N.get("ALT","?")}[e]?.includes(t)) ? 1 : -1'), f'e.compatibleDomains.some((e) => {N.get("ALT","?")}[e]?.includes(t)) ? 1 : 2', 1),
  ("B2 picker shows other entity types in their own 'Any other entity' group", MAIN,
   r'\t+\.\.\.(\w+)\.length > 0 \? \[\{\n(\t+)label: "Other switches · on/off only",\n\t+options: \[\],\n\t+collapsed: !0,\n\t+groups: (\w+)\((\w+)\.filter\(\(e\) => e\.matchRank > 0\)\)\n\t+\}\] : \[\]',
   lambda m: (f'\t\t\t\t\t...{m[4]}.some((e) => e.matchRank === 1) ? [{{\n{m[2]}label: "Other switches · on/off only",\n{m[2]}options: [],\n{m[2]}collapsed: !0,\n{m[2]}groups: {m[3]}({m[4]}.filter((e) => e.matchRank === 1))\n\t\t\t\t\t}}] : [],\n'
              f'\t\t\t\t\t...{m[4]}.some((e) => e.matchRank >= 2) ? [{{\n{m[2]}label: "Any other entity · any type",\n{m[2]}options: [],\n{m[2]}collapsed: !0,\n{m[2]}groups: {m[3]}({m[4]}.filter((e) => e.matchRank >= 2))\n\t\t\t\t\t}}] : []'), 1),
  ("B3 search box wording", MAIN, R('placeholder: "Search compatible matches…"'), 'placeholder: "Search all Home Assistant entities…"', 1),
  ("C1 device-class limits only apply to same-type entities; window/door contacts stay strict", MAIN,
   R(f'? {N.get("CONTACT","?")}(t, n) : {N.get("DEVCLASS","?")}(e.spec, t, n))'),
   f'? {N.get("CONTACT","?")}(t, n) : {N.get("RANK","?")}(e.spec, {N.get("DOMAIN","?")}(t)) > 0 || {N.get("DEVCLASS","?")}(e.spec, t, n))', 1),
  ("C2 no device-class error for a connected entity of another type", MAIN,
   R(': !t.spec.compatibleDeviceClasses.includes(String(r))) && f.push('),
   f': {N.get("RANK","?")}(t.spec, {N.get("RESDOMAIN","?")}) === 0 && !t.spec.compatibleDeviceClasses.includes(String(r))) && f.push(', 1),
  ("C3 saved connections of another type pass device-class validation", MAIN,
   R(f'(c.kind === "opening-contact" ? {N.get("CONTACT","?")}(a, n) : {N.get("DEVCLASS","?")}(c.spec, a, n)) || i("profile.device-class"'),
   f'(c.kind === "opening-contact" ? {N.get("CONTACT","?")}(a, n) : {N.get("RANK","?")}(c.spec, {N.get("DOMAIN","?")}(a)) > 0 || {N.get("DEVCLASS","?")}(c.spec, a, n)) || i("profile.device-class"', 1),
  ("D1 imported device models receive their state, visual state and motion setting", MAIN,
   rf'component: (?:\(\)|\(\{{ state: e \}}\)) => /\* @__PURE__ \*/ \(0, (\w+)\.jsx\)\({R(IMF)}, \{{\s*model: r(?:,\s*state: e)?\s*\}}\),',
   lambda m: f'component: (e) => /* @__PURE__ */ (0, {m[1]}.jsx)({IMF}, {{ model: r, state: e?.state, coverState: e?.state, coverVisual: e?.visualState, reducedMotion: e?.reducedMotion }}),', 1),
  ("D2+F2 imported Cover models animate 'cover-curtain'/'cover-rail'; floor models block walking per part", MAIN,
   rf'//#region packages/engine/src/imported-models/ImportedModel\.tsx\nfunction {R(IMF)}\(\{{ model: e, size: t = e\.normalization\.size(, state: n)? \}}\) \{{\n(\tlet [^\n]*;\n)',
   lambda m: COVER_ANIM + f'//#region packages/engine/src/imported-models/ImportedModel.tsx\nfunction {IMF}({{ model: e, size: t = e.normalization.size{m[1] or ""}, coverState: __cs, coverVisual: __cv, reducedMotion: __rm }}) {{\n{m[2]}' + hook, 1),
  ("F1 imported models are no longer one solid walk box", MAIN,
   R('walkCollider: e.modelId.startsWith("custom:") && e.placement.kind === "absolute"'), 'walkCollider: !1', 2),
  ("G1 imported models resize width, height and depth independently", MAIN,
   r'(bounds: r\.normalization\.bounds,\n(\t+))resizePolicy: \{ kind: "uniform" \},',
   lambda m: f'{m[1]}resizePolicy: {{\n{m[2]}\tkind: "axes",\n{m[2]}\taxes: ["width", "height", "depth"]\n{m[2]}}},', 1),
  ("G2 imported furniture stretches per axis instead of uniformly", MAIN,
   r'(\w+) = t\[0\] / (\w+)\.size\[0\]', lambda m: f'{m[1]} = [t[0] / {m[2]}.size[0], t[1] / {m[2]}.size[1], t[2] / {m[2]}.size[2]]', 1),
  ("H1 covers without position feedback (state 'unknown') stay controllable", MAIN,
   R('available: !["unknown", "unavailable"].includes(e.state),'),
   'available: e.state !== "unavailable" && (e.state !== "unknown" || String(e.entity_id).startsWith("cover.")),', 1),
  ("E3 roller-shutter is a known built-in model ID", MAIN, R('.motorized-blind.leak-sensor'), '.motorized-blind.roller-shutter.leak-sensor', 1),
  ("E1 built-in Roller shutter model", CATALOG,
   R('//#region packages/catalog/src/device/presets/covers/motorized-curtain.tsx\n'),
   lambda m: ROLLER + '//#region packages/catalog/src/device/presets/covers/motorized-curtain.tsx\n', 1),
  ("E2 register Roller shutter next to Motorized blind", CATALOG,
   rf'\t"motorized-blind": {R(C.get("DEFINE","?"))}\(\{{\n', lambda m: ROLLER_ENTRY + m[0], 1),
]

for name, file, pattern, repl, count in PATCHES:
    found = len(re.findall(pattern, src[file]))
    if found != count:
        problems.append(f"{name}: expected {count}, found {found}")
        print(f"MISS {name}: expected {count}, found {found}")
        continue
    src[file] = re.sub(pattern, repl if callable(repl) else (lambda r: (lambda m: m.expand(r)))(repl) if "\\" in repl else (lambda r: (lambda m: r))(repl), src[file])
    print(f"ok  {name}")

if problems:
    sys.exit(("CHECK: " if CHECK else "ABORT: ") + f"{len(problems)} problem(s); nothing written.")
if CHECK:
    sys.exit("CHECK: all patches match.")
for file, text in src.items():
    (assets / file).write_text(text, encoding="utf-8")
man_path = root / "frontend/manifest.json"
man = json.loads(man_path.read_text())
for rel in man["files"]:
    man["files"][rel] = hashlib.sha256((root / "frontend" / rel).read_bytes()).hexdigest()
man_path.write_text(json.dumps(man, indent=2) + "\n")
print("manifest checksums updated")
