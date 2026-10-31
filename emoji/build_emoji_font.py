"""Make Apple Color Emoji usable inside Beeper Desktop on Windows and Linux.

Input: AppleColorEmoji-Linux.ttf, which you download yourself from
https://github.com/samuelngs/apple-emoji-ttf/releases (this project does not ship it).

That build only shapes emoji sequences (skin tones, families, couples, flags) with Apple's own
'morx' table. Chromium, and so Beeper, drops 'morx', so every sequence falls apart into separate
characters. This script rebuilds those joins as a standard OpenType GSUB table, which Chromium keeps:

  1. read the emoji sequences Beeper itself offers, from your Beeper install (app.asar), and add
     every mixed skin-tone combination of the couple/handshake templates
  2. shape each sequence through the original font's 'morx' with HarfBuzz to learn the result
  3. write those results as GSUB ligatures (plus a split step for couples drawn as two halves),
     keep the font's own GPOS/GDEF, add Windows name records, drop the unused Apple tables
  4. shape every sequence again through the new font and compare glyphs and positions

Requires: Python 3.10+, `pip install fonttools uharfbuzz`
Usage:    python build_emoji_font.py INPUT.ttf OUTPUT.ttf [--asar PATH_TO_app.asar]
"""
import argparse
import itertools
import os
import re
import sys

import uharfbuzz as hb
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.ttLib import TTFont

SKIN = ['1f3fb', '1f3fc', '1f3fd', '1f3fe', '1f3ff']


def default_asar():
    candidates = []
    if os.name == 'nt':
        candidates.append(os.path.expandvars(r'%LOCALAPPDATA%\Programs\BeeperTexts\resources\app.asar'))
    candidates += ['/opt/beeper/resources/app.asar', '/opt/BeeperTexts/resources/app.asar',
                   '/usr/lib/beeper/resources/app.asar',
                   os.path.expanduser('~/Applications/Beeper/resources/app.asar')]
    return next((c for c in candidates if os.path.isfile(c)), None)


def read_sequences(asar_path):
    """Emoji sequences from the emoji data bundled in Beeper (e.g. "1f44d-1f3fb")."""
    data = open(asar_path, 'rb').read()
    found = {m.decode() for m in re.findall(rb'"unified":"([0-9a-f-]+)"', data)}
    if not found:
        sys.exit('No emoji data found in ' + asar_path)
    seqs = set(found)
    # Beeper only lists same-skin couples; Apple draws every mixed combination too
    for code in found:
        parts = code.split('-')
        idx = [i for i, p in enumerate(parts) if p in SKIN]
        if len(idx) >= 2:
            for combo in itertools.product(SKIN, repeat=len(idx)):
                q = list(parts)
                for i, m in zip(idx, combo):
                    q[i] = m
                seqs.add('-'.join(q))
    out = set()
    for code in seqs:
        cps = tuple(int(x, 16) for x in code.split('-') if x)
        if cps:
            out.add(cps)
            stripped = tuple(c for c in cps if c != 0xFE0F)  # keyboards send both forms
            if stripped:
                out.add(stripped)
    return sorted(out)


def shaper(path):
    tt = TTFont(path, lazy=True)
    font = hb.Font(hb.Face(hb.Blob.from_file_path(path)))
    order = tt.getGlyphOrder()

    def shape(cps):
        buf = hb.Buffer()
        buf.add_codepoints(list(cps))
        buf.guess_segment_properties()
        hb.shape(font, buf, {})
        return ([order[i.codepoint] for i in buf.glyph_infos],
                [(p.x_advance, p.x_offset, p.y_offset) for p in buf.glyph_positions])
    return tt.getBestCmap(), shape


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input', help='AppleColorEmoji-Linux.ttf from samuelngs/apple-emoji-ttf')
    ap.add_argument('output', help='where to write the Beeper-ready font')
    ap.add_argument('--asar', help='path to Beeper\'s resources/app.asar (auto-detected if omitted)')
    args = ap.parse_args()

    asar = args.asar or default_asar()
    if not asar or not os.path.isfile(asar):
        sys.exit('Could not find Beeper\'s app.asar; pass it with --asar')

    seqs = read_sequences(asar)
    cmap, shape_orig = shaper(args.input)
    print(f'{len(seqs)} sequences from {asar}')

    # 1-2. learn every join from the original font's morx
    rules = []
    for cps in seqs:
        if len(cps) < 2 or any(c not in cmap for c in cps):
            continue
        inp = [cmap[c] for c in cps]
        out, _ = shape_orig(cps)
        if out != inp:
            rules.append((inp, out))
    print(f'{len(rules)} joined sequences, {sum(len(o) > 1 for _, o in rules)} drawn as two halves')

    # 3. rebuild as GSUB
    tt = TTFont(args.input)
    order = list(tt.getGlyphOrder())
    lig, split, placeholders = [], [], []
    for inp, out in rules:
        seq = ' '.join('\\' + g for g in inp)
        if len(out) == 1:
            lig.append(f'  sub {seq} by \\{out[0]};')
        else:
            ph = f'seqsplit.{len(placeholders):03d}'
            placeholders.append(ph)
            lig.append(f'  sub {seq} by \\{ph};')
            split.append(f'  sub \\{ph} by ' + ' '.join('\\' + g for g in out) + ';')
    if placeholders:  # exist only between the two lookups; never drawn
        tt.setGlyphOrder(order + placeholders)
        for ph in placeholders:
            tt['hmtx'].metrics[ph] = (0, 0)
            if 'vmtx' in tt:
                tt['vmtx'].metrics[ph] = (0, 0)
    fea = 'languagesystem DFLT dflt;\n\nlookup emojiSequences {\n' + '\n'.join(lig) + '\n} emojiSequences;\n\n'
    if split:
        fea += 'lookup emojiSplitHalves {\n' + '\n'.join(split) + '\n} emojiSplitHalves;\n\n'
    fea += 'feature ccmp {\n  lookup emojiSequences;\n' + ('  lookup emojiSplitHalves;\n' if split else '') + '} ccmp;\n'
    # Only GSUB is built: the font's GPOS (which overlays couple halves) and GDEF stay as they are
    addOpenTypeFeaturesFromString(tt, fea, tables=['GSUB'])
    for tag in ('morx', 'feat', 'trak'):
        if tag in tt:
            del tt[tag]
    # The family name only exists in the Mac name records; Windows reads the Windows ones
    name = tt['name']
    for nid, val in ((1, 'Apple Color Emoji'), (2, 'Regular'), (4, 'Apple Color Emoji'), (6, 'AppleColorEmoji')):
        name.setName(val, nid, 3, 1, 0x409)
    tt.save(args.output)
    print('wrote', args.output)

    # 4. verify the rebuilt font against the original, sequence by sequence
    _, shape_new = shaper(args.output)
    bad = [cps for cps in seqs if all(c in cmap for c in cps) and shape_orig(cps) != shape_new(cps)]
    if bad:
        print(f'{len(bad)} sequences differ, e.g. {["-".join(f"{c:X}" for c in b) for b in bad[:5]]}')
        sys.exit(1)
    print(f'verified: all {len(seqs)} sequences shape identically to the original')


if __name__ == '__main__':
    main()
