# Third-party notices for the embedded image compressor

This notice covers only the static image compressor under /compreesor/.
It does not relicense Mickywa-homepage, the application, other tools, fonts,
media, or any third-party component. Existing terms remain unchanged.

## Verified scope

The mirror was introduced by [commit eccbb0c6](https://github.com/yanghaoleng/Mickywa-homepage/commit/eccbb0c6b129dcbfc09c0c5b3c6e0ec779f4e29c) on 2026-08-12.
All 18 WASM files match members of seven fixed jSquash npm packages.
Git blob SHA-1 values from the GitHub tree were compared with package bytes;
SHA-256, original paths and package SHA-512 integrity are recorded in
[licenses/INVENTORY.json](licenses/INVENTORY.json).
Official npm tarball integrity matches the corresponding entries in the
[historical Compreesor lockfile](https://github.com/yanghaoleng/compreesor/blob/693ea921c9de9cca6a813db2cb08c7de544990f4/package-lock.json).
This proves the binary content matches those releases, not that the later
repository commit reproduces this older UI bundle.

This mirror has no FFmpeg core file, and the checked JavaScript contains no
FFmpeg reference. It is an earlier image-only build. Current FFmpeg web/desktop
notices must not be copied here as if they identified this build.

## Preserved original notices

| Component | Version | Evidence | Original notices |
| --- | --- | --- | --- |
| @jsquash/avif | 2.1.1 | 3 matching WASM files | [licenses/jsquash-avif/LICENSE](licenses/jsquash-avif/LICENSE) |
| @jsquash/jpeg | 1.6.0 | 2 matching WASM files | [licenses/jsquash-jpeg/LICENSE](licenses/jsquash-jpeg/LICENSE)<br>[licenses/jsquash-jpeg/codec/LICENSE.codec.md](licenses/jsquash-jpeg/codec/LICENSE.codec.md) |
| @jsquash/jxl | 1.3.0 | 4 matching WASM files | [licenses/jsquash-jxl/LICENSE](licenses/jsquash-jxl/LICENSE) |
| @jsquash/oxipng | 2.3.0 | 2 matching WASM files | [licenses/jsquash-oxipng/LICENSE](licenses/jsquash-oxipng/LICENSE)<br>[licenses/jsquash-oxipng/codec/LICENSE.codec.md](licenses/jsquash-oxipng/codec/LICENSE.codec.md) |
| @jsquash/png | 3.1.1 | 1 matching WASM files | [licenses/jsquash-png/LICENSE](licenses/jsquash-png/LICENSE)<br>[licenses/jsquash-png/codec/LICENSE.codec.md](licenses/jsquash-png/codec/LICENSE.codec.md) |
| @jsquash/resize | 2.1.1 | 3 matching WASM files | [licenses/jsquash-resize/LICENSE](licenses/jsquash-resize/LICENSE)<br>[licenses/jsquash-resize/lib/hqx/LICENSE.codec.md](licenses/jsquash-resize/lib/hqx/LICENSE.codec.md)<br>[licenses/jsquash-resize/lib/magic-kernel/LICENSE.codec.md](licenses/jsquash-resize/lib/magic-kernel/LICENSE.codec.md)<br>[licenses/jsquash-resize/lib/resize/LICENSE.codec.md](licenses/jsquash-resize/lib/resize/LICENSE.codec.md) |
| @jsquash/webp | 1.5.0 | 3 matching WASM files | [licenses/jsquash-webp/LICENSE](licenses/jsquash-webp/LICENSE)<br>[licenses/jsquash-webp/codec/LICENSE.codec.md](licenses/jsquash-webp/codec/LICENSE.codec.md) |
| react | 19.2.8 | JavaScript version strings | [licenses/react/LICENSE](licenses/react/LICENSE) |
| react-dom | 19.2.8 | JavaScript version strings | [licenses/react-dom/LICENSE](licenses/react-dom/LICENSE) |

The jSquash wrapper license is Apache-2.0, Copyright [2023] jamsinclair.
The linked codec notices are copied verbatim from those exact packages;
their separate copyright and terms remain authoritative.
React and ReactDOM are MIT, Copyright (c) Meta Platforms, Inc. and affiliates.
No new noncommercial restriction is imposed on these components.

## Verification still open

This is partial notice restoration, not a complete native dependency audit.

- AVIF and JPEG XL packages do not ship separate native codec notices.
  Their libavif/libaom/libsharpyuv and libjxl/Brotli/Highway/skcms inputs
  and complete notices need separate verification.
- JPEG's supplied notice references an IJG README absent from the npm package;
  that original file still needs inclusion from the corresponding source.
- PNG, Oxipng, resizing and other WASM may embed more Rust/C/C++ code.
  Wrapper SPDX fields and one codec notice are not exhaustive inventories.
- The complete provenance of bundled JavaScript, workers and UI helpers
  remains open. This document grants no license to the original application.
- Updating mirror assets requires renewed checks. A prebuild verifier checks
  recorded runtime and notice hashes. Historical copies remain separate.

See [DISTRIBUTION_REVIEW.md](DISTRIBUTION_REVIEW.md) for fixed build references.
