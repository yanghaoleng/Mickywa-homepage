# Embedded image compressor distribution review

Checked 2026-11-08. This factual checklist is not a legal opinion, relicense,
compliance guarantee, written source offer, or long-term source commitment.
Current Compreesor FFmpeg obligations are distinct from this old image mirror.

## Completed

- Matched all 18 WASM files to seven exact jSquash npm releases.
- Verified npm archives against historical lockfile SHA-512 integrity.
- Preserved every license/codec notice shipped in those packages, plus
  React/ReactDOM MIT notices.
- Added a static notice page and license metadata link in index.html.
- Added a prebuild verifier for reviewed runtime and notice hashes.
- Left all JavaScript, CSS and WASM runtime bytes unchanged.

## Build references, not a reproducible-build claim

- [packages/avif/codec/Makefile](https://github.com/jamsinclair/jSquash/blob/b7fa9ac9ec02f224847ad23d19d115f9e296a368/packages/avif/codec/Makefile)
- [packages/jxl/codec/Makefile](https://github.com/jamsinclair/jSquash/blob/1b1964194611ece3ec984ab91c04726d1088f05e/packages/jxl/codec/Makefile)
- [packages/jpeg/codec/Makefile](https://github.com/jamsinclair/jSquash/blob/1f62015f53e28bd18b2d7c8a3ca3326577efc445/packages/jpeg/codec/Makefile)

The AVIF recipe names libavif v1.0.1, libaom v3.7.0, and libwebp/sharpyuv
commit e2c85878f6a33f29948b43d3492d9cdaf801aa54.
JPEG XL pins libjxl 9f544641ec83f6abd9da598bdd08178ee8a003e0, linking Brotli,
Highway and skcms. JPEG references MozJPEG v3.3.1.
These references do not claim that a local rebuild reproduces npm binaries.

## Still open

1. Retrieve applicable native codec/submodule notices at pinned versions,
   including the IJG README.
2. Reconstruct Rust crate and other native inputs whose notices are not
   exhaustively present in npm packages.
3. Audit remaining minified JavaScript helpers/icons using original build
   inputs or source maps if available.
4. Verify actual deployed static paths and historical downloads separately.
5. Review other Mickywa mirrors separately; this work covers /compreesor/ only.
