# Changelog

## [0.1.8](https://github.com/radicand/simple-books/compare/v0.1.7...v0.1.8) (2026-05-18)


### Bug Fixes

* **ci:** run Playwright smoke tests against production build ([248f0f1](https://github.com/radicand/simple-books/commit/248f0f180802180e4b79c459107fa96b0609f146))
* failing startup in docker ([61b0dbd](https://github.com/radicand/simple-books/commit/61b0dbd8cfb261703c6fa390fc40baa70ba8de5d))
* failing tests ([61b0dbd](https://github.com/radicand/simple-books/commit/61b0dbd8cfb261703c6fa390fc40baa70ba8de5d))

## [0.1.7](https://github.com/radicand/simple-books/compare/v0.1.6...v0.1.7) (2026-05-18)


### Features

* dark mode ([6a1b020](https://github.com/radicand/simple-books/commit/6a1b02047011f5a4bebb45bfe9751d76594f2a3f))
* edit invoices ([7ee2fb2](https://github.com/radicand/simple-books/commit/7ee2fb210956b3b13dd5efcc6dd5dfb9e78bce8e))
* pg database option ([6a1b020](https://github.com/radicand/simple-books/commit/6a1b02047011f5a4bebb45bfe9751d76594f2a3f))


### Bug Fixes

* editing auto-created invoices ([6a1b020](https://github.com/radicand/simple-books/commit/6a1b02047011f5a4bebb45bfe9751d76594f2a3f))
* oidc login name display ([6a1b020](https://github.com/radicand/simple-books/commit/6a1b02047011f5a4bebb45bfe9751d76594f2a3f))

## [0.1.6](https://github.com/radicand/simple-books/compare/v0.1.5...v0.1.6) (2026-05-18)


### Features

* edit supported now ([c59b73d](https://github.com/radicand/simple-books/commit/c59b73dcc88435cc7b36ba3cfc7b6e52be53f581))


### Bug Fixes

* server import issue ([c59b73d](https://github.com/radicand/simple-books/commit/c59b73dcc88435cc7b36ba3cfc7b6e52be53f581))

## [0.1.5](https://github.com/radicand/simple-books/compare/v0.1.4...v0.1.5) (2026-05-18)


### Bug Fixes

* display issues ([6c0e752](https://github.com/radicand/simple-books/commit/6c0e752556273b0a70721f15271bdda9f2b8357c))

## [0.1.4](https://github.com/radicand/simple-books/compare/v0.1.3...v0.1.4) (2026-05-17)


### Bug Fixes

* link oidc with existing accounts ([a7f7ad7](https://github.com/radicand/simple-books/commit/a7f7ad7632d2deb0b63cc7de57152c9f13e78253))

## [0.1.3](https://github.com/radicand/simple-books/compare/v0.1.2...v0.1.3) (2026-05-17)


### Features

* dependabot ([a19a1d4](https://github.com/radicand/simple-books/commit/a19a1d4b17d07c1ec53aa03a24f18e33494abb5f))
* favicon ([dbf097e](https://github.com/radicand/simple-books/commit/dbf097ecd043c6bc283ca9b36c60139ddc298956))
* sec-review skill ([127b16f](https://github.com/radicand/simple-books/commit/127b16f889020cd2ad181af6bb59bfe889b848b2))


### Bug Fixes

* close flagged security gaps ([661541b](https://github.com/radicand/simple-books/commit/661541b726655b076b9ae9c85a82139ae6727168))
* **docker:** drop build-only deps from runtime image for Trivy ([02a2c13](https://github.com/radicand/simple-books/commit/02a2c13a6d80ddbd295eff75ce73d42f6ae245e9))
* link oidc accounts ([7af7d48](https://github.com/radicand/simple-books/commit/7af7d4852a5906f27202c759ccb19619804f713b))

## [0.1.2](https://github.com/radicand/simple-books/compare/v0.1.1...v0.1.2) (2026-05-17)


### Features

* **docker:** publish release images for amd64 and arm64 ([6da83f4](https://github.com/radicand/simple-books/commit/6da83f479308bc38a223817d11ce2ebd3abcfb2d))


### Bug Fixes

* **ci:** do not fail Docker workflow on Trivy base-image CVEs ([490f4d3](https://github.com/radicand/simple-books/commit/490f4d348b45e6cbb8310b8b683bb876bcbfd76b))
* **release:** bump Chart appVersion via release-please ([36c5f2d](https://github.com/radicand/simple-books/commit/36c5f2de48d1cbe66ae273a1eb4e289faaaac250))
* rp ([178b332](https://github.com/radicand/simple-books/commit/178b332742c995b931e90be5614b86e7c8eb283c))
* tests ([47a4c00](https://github.com/radicand/simple-books/commit/47a4c00b559da056fd31c779b0659cac63382f1d))
* use token for rp ([d873fe8](https://github.com/radicand/simple-books/commit/d873fe82d0e6ae9c936f6f85a3c15b74b25d89d5))

## [0.1.1](https://github.com/radicand/simple-books/compare/v0.1.0...v0.1.1) (2026-05-17)


### Features

* full MVP — UI, server fns, reports, smoke test, prod build ([b7393e8](https://github.com/radicand/simple-books/commit/b7393e83f7598adee0d6bda2837d757310ab0ba1))
* MVP polish, deployment pipeline, and Helm chart ([4b5a89f](https://github.com/radicand/simple-books/commit/4b5a89fc4854466b06ac428fc3264c23533d7761))
* scaffold simple-books MVP — TanStack Start + Bun + Drizzle + better-auth ([2de6010](https://github.com/radicand/simple-books/commit/2de601066986bae54317c778751ae3d453069b8e))


### Bug Fixes

* **ci:** use plain docker build on PR — GHA cache needs buildx driver ([a2ae78c](https://github.com/radicand/simple-books/commit/a2ae78ce8eb8fb3719d51443a79f692f9d22d790))
* **ci:** use valid trivy-action ref with v prefix ([66d3c1d](https://github.com/radicand/simple-books/commit/66d3c1d1ab6b297847b12377e2dee0a6a654eb2f))
* harden mileage step in smoke test for CI ([e5ad663](https://github.com/radicand/simple-books/commit/e5ad66322c3e9b8fe2d82152e3acb9023fc24e0d))
* smoke test asserts only visible money amounts ([13a25fd](https://github.com/radicand/simple-books/commit/13a25fd459633dc2d5338e263e940b23786f5f98))
* smoke test targets visible invoice line table on desktop ([e670024](https://github.com/radicand/simple-books/commit/e67002435297149352ad67bc3835762c594ef96c))
* stabilize reports navigation in smoke test for CI ([14c1dd4](https://github.com/radicand/simple-books/commit/14c1dd47fb3297ca801ca90c035b9c2bab1cca25))
* tests ([b3302e4](https://github.com/radicand/simple-books/commit/b3302e493d609fa1f211f9932caa45b5d3119a52))
