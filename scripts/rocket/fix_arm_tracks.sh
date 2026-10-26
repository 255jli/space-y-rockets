#!/usr/bin/env bash
# fix_arm_tracks.sh — патчит _arm_tracks() в station_model.py
# Запуск из любой директории: auto-detect файла.
#   ./fix_arm_tracks.sh                     # сам найдёт station_model.py
#   ./fix_arm_tracks.sh scripts/station_model.py   # явный путь

set -euo pipefail

# --- locate target -----------------------------------------------------------
TARGET=""
if [[ -n "${1:-}" ]]; then
    TARGET="$1"
elif [[ -f "station_model.py" ]]; then
    TARGET="station_model.py"
elif [[ -f "scripts/station_model.py" ]]; then
    TARGET="scripts/station_model.py"
else
    echo "error: station_model.py not found in cwd or ./scripts/" >&2
    echo "usage: $0 [path/to/station_model.py]" >&2
    exit 1
fi
echo "target:  $TARGET"

# --- backup ------------------------------------------------------------------
cp "$TARGET" "${TARGET}.bak.$(date +%Y%m%d-%H%M%S)"

# --- patch (line-based, no regex on function bodies) -------------------------
python3 - "$TARGET" <<'PYEOF'
import sys
from pathlib import Path

path = Path(sys.argv[1])
lines = path.read_text().splitlines(keepends=True)

# 1) найти начало функции
start = None
for i, l in enumerate(lines):
    if l.lstrip().startswith("def _arm_tracks("):
        start = i
        break
if start is None:
    sys.exit("error: 'def _arm_tracks(' not found")

# 2) найти её 'return tracks' (строку без отступа-кода)
end = None
for j in range(start, len(lines)):
    if lines[j].strip() == "return tracks":
        end = j + 1
        break
if end is None:
    sys.exit("error: 'return tracks' not found after def")

# 3) idempotency: уже пропатчено?
body = "".join(lines[start:end])
if "ts, fracs = times" in body:
    print("already patched - nothing to do")
    sys.exit(0)

# 4) заменить целиком
new_fn = '''def _arm_tracks(pose_a, pose_b, times):
    """Joint rotation tracks interpolating from pose_a to pose_b.

    ``times`` is the 2-tuple returned by ``_normalized_keys``:
    ``(keyframe_times, normalized_fractions)``.
    """
    ts, fracs = times
    pa, pb = POSES[pose_a], POSES[pose_b]
    tracks = []
    for idx, (name, axis) in enumerate(zip(JOINT_NAMES, JOINT_AXES)):
        if abs(pa[idx] - pb[idx]) < 1e-6:
            continue
        keys = []
        for t_frac in fracs:
            angle = pa[idx] + t_frac * (pb[idx] - pa[idx])
            keys.extend(_quat(axis, angle))
        tracks.append((name, "rotation", ts, keys, "VEC4"))
    return tracks
'''
lines[start:end] = [new_fn]
path.write_text("".join(lines))
print(f"patched: _arm_tracks()  [lines {start+1}..{end}]")
PYEOF

# --- verify: syntax ----------------------------------------------------------
echo "syntax:  checking..."
python3 -m py_compile "$TARGET"
echo "syntax:  ok"

# --- verify: smoke test ------------------------------------------------------
echo "smoke:   running _arm_tracks()..."
python3 - "$TARGET" <<'PYEOF'
import importlib.util, sys
from pathlib import Path

p = Path(sys.argv[1]).resolve()
spec = importlib.util.spec_from_file_location("sm", p)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

times = mod._normalized_keys(0.0, 3.0, 9)
tracks = mod._arm_tracks("stow", "grapple", times)
assert tracks, "no tracks produced"
for name, kind, ts, keys, atype in tracks:
    assert kind == "rotation",  f"{name}: unexpected kind {kind}"
    assert atype == "VEC4",     f"{name}: unexpected type {atype}"
    assert len(keys) % 4 == 0,  f"{name}: keys not multiple of 4"
    assert len(ts) == len(keys) // 4, f"{name}: times/keys mismatch"
print(f"smoke:   ok ({len(tracks)} tracks)")
PYEOF

# --- done --------------------------------------------------------------------
echo ""
echo "done. теперь:"
echo "  python3 $TARGET --out station.glb"