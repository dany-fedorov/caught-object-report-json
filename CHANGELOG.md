# [9.0.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v8.0.0...v9.0.0) (2026-09-12)


### Bug Fixes

* address report sizing and identity review findings ([6d7fb31](https://github.com/dany-fedorov/caught-object-report-json/commit/6d7fb318b0a0db36389faa6c31dffd3f5266913a))
* preserve metadata when cloning report options ([1307ab1](https://github.com/dany-fedorov/caught-object-report-json/commit/1307ab127cba17c57af6a9e9d86b2e959a56eb31))
* preserve required report fields and enforce full coverage ([3dc848a](https://github.com/dany-fedorov/caught-object-report-json/commit/3dc848a122f43713aeaff0cf1bf9ba2d9c381c4c))


### Features

* Add next version of schema and update safe-stable-stringify name ([c184e5d](https://github.com/dany-fedorov/caught-object-report-json/commit/c184e5d5502e999a0da8a5696121c3cd8d52f857))
* apply configurable size budgets to complete reports ([20cf6d4](https://github.com/dany-fedorov/caught-object-report-json/commit/20cf6d46597575b5243266ba5f7114ceba676b81))
* finish length-limited JSON serialization ([489ea58](https://github.com/dany-fedorov/caught-object-report-json/commit/489ea58170fb49dad3dd3cc70df51cfc8a135319))
* omit report fields that hold their expected value ([0e51179](https://github.com/dany-fedorov/caught-object-report-json/commit/0e511799b39b285beaac831a40a88d9ec577e49f))
* shorten the API, bound child discovery, add corj/v0.12 ([5f77460](https://github.com/dany-fedorov/caught-object-report-json/commit/5f774607232aff37bca5a22d885e66a228045b74))
* store stack as lines, derive header fields, split report versions ([3fbad67](https://github.com/dany-fedorov/caught-object-report-json/commit/3fbad6756db2a858d7b1d0ed908b3d9dbe8f7cf3))
* WIP on cutting JSONs that are too long ([e93b77a](https://github.com/dany-fedorov/caught-object-report-json/commit/e93b77a3edf4a73357dbecb33b8ffda0ca7be973))
* WIP on JSON length counter ([8b9db03](https://github.com/dany-fedorov/caught-object-report-json/commit/8b9db0386f309b2848bcebc8e30abfad015df696))


### BREAKING CHANGES

* report schema is corj/v0.12 and the API is renamed.

- `makeCaughtObjectReportJson` / `...Array` and the `bakeCorj` aliases
  become `makeCorj` / `makeCorjArray`.
- `new CorjMaker(options?)` takes partial options and validates them,
  replacing `CorjMaker.withDefaults`; `cloneWith` becomes `with`;
  `maker.options` is frozen; the `*Entries` methods are gone.
- `CORJ_MAKER_DEFAULT_OPTIONS` becomes `CORJ_DEFAULT_OPTIONS`.
- Options: `maxChildrenLevel` -> `maxDepth`, `parseStackToArray` ->
  `stackFormat`, `metadataFields` + `childrenMetadataFields` -> `metadata`,
  `onCaughtMaking` + `printWarningsOnUnhandledErrors` -> `onError`.
  `asJsonFormatsToApply` / `asStringFormatsToApply` are gone: the
  `toCorjAsJson` / `toCorjAsString` methods are always tried first.
  Unknown option names now throw.
- Report: child nodes link through `child_ids` instead of `children`;
  free-text `children_omitted_reason` becomes `children_omitted` with the
  codes `max_depth`, `max_children` and `max_size`; `null` children are
  never produced; markers are `[truncated]` and `[circular]`.
- Types are prefixed `Corj*`; the old names remain as deprecated aliases.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bk8TYkYWn5cHYno8ifiznV
* `stack` is an array of lines by default; pass
`parseStackToArray: false` for the previous string. `constructor_name` and
`message` are absent from default reports when derivable from the first
stack line. Complete reports carry `v: "corj/v0.11-full"` and validate
against the `corj/v0.11-full` schema.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bk8TYkYWn5cHYno8ifiznV
* `instanceof_error`, `typeof`, `as_string`, `as_json`,
`as_json_format` and `children_sources` are optional in
`CaughtObjectReportJson` and absent from default reports when they hold
their expected value. Reports validate against corj/v0.11, not v0.10.
Pass `omitExpectedValues: false` or use `restoreExpectedValues()` to get
the previous shape.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bk8TYkYWn5cHYno8ifiznV
* The default size limit now applies to the whole CORJ report
or report array in UTF-8 bytes. All content fields can be truncated and child
reports can be omitted to meet this limit. Configure maxReportSize and
reportSizeUnit to match the integration's budget.
* Reports use corj/v0.10 and the
safe-stable-stringify-with-length-limit format. Replace
CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1 with
CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_WITH_LENGTH_LIMIT. Oversized as_json
values are now truncated at 100,000 serialized UTF-16 code units.

# [8.0.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v7.2.0...v8.0.0) (2024-09-15)


### Features

* Bump version with breaking change ([157db66](https://github.com/dany-fedorov/caught-object-report-json/commit/157db661a2f0721632a6109a32982174f01e6120))


### BREAKING CHANGES

* need to bump the version!

# [7.2.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v7.1.7...v7.2.0) (2024-09-15)


### Features

* Implement parseStackToArray, add handling of more insane edge cases, add tests ([92b396b](https://github.com/dany-fedorov/caught-object-report-json/commit/92b396b327895f80eb2bd36269f55d567fbd1193))
* Redeploy ([f5b31b6](https://github.com/dany-fedorov/caught-object-report-json/commit/f5b31b6ab135d5a082c7822a96b7fd512128eb28))
* Redeploy ([4f3e0d6](https://github.com/dany-fedorov/caught-object-report-json/commit/4f3e0d6a3a56542059223410141893e34ac6499d))

## [7.1.7](https://github.com/dany-fedorov/caught-object-report-json/compare/v7.1.6...v7.1.7) (2023-05-23)

## [7.1.6](https://github.com/dany-fedorov/caught-object-report-json/compare/v7.1.5...v7.1.6) (2023-05-23)

## [7.1.5](https://github.com/dany-fedorov/caught-object-report-json/compare/v7.1.4...v7.1.5) (2023-05-07)

## [7.1.4](https://github.com/dany-fedorov/caught-object-report-json/compare/v7.1.3...v7.1.4) (2023-02-12)

## [7.1.3](https://github.com/dany-fedorov/caught-object-report-json/compare/v7.1.2...v7.1.3) (2023-02-12)

## [7.1.2](https://github.com/dany-fedorov/caught-object-report-json/compare/v7.1.1...v7.1.2) (2023-02-12)

## [7.1.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v7.1.0...v7.1.1) (2023-02-06)


### Bug Fixes

* Safely access protocol methods ([57cd79e](https://github.com/dany-fedorov/caught-object-report-json/commit/57cd79eaed11f53a256f6192a86ae8536cfb4e60))

# [7.1.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v7.0.0...v7.1.0) (2023-02-06)


### Features

* Check types returned by protocol methods ([7c27dcd](https://github.com/dany-fedorov/caught-object-report-json/commit/7c27dcdf6a4cd2fca779576b67426cb7c56116dc))
* Intorduce protocol for objects to provide their own `as_string` ([ced7dca](https://github.com/dany-fedorov/caught-object-report-json/commit/ced7dca376bb71c972663131b5d5009215ffce30))

# [7.0.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.6.0...v7.0.0) (2023-02-06)


### Features

* Remove `make` and `entries` methods ([7ed9460](https://github.com/dany-fedorov/caught-object-report-json/commit/7ed946024fec690397128f51810adcb69e586290))


### BREAKING CHANGES

* In this commit - e59e2db

# [6.6.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.5.0...v6.6.0) (2023-02-06)


### Features

* Undo breaking change (accidentally release breaking change as minor) ([d870549](https://github.com/dany-fedorov/caught-object-report-json/commit/d870549005b530291fc0c9a159123b1f07ca33a9))

# [6.5.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.4.3...v6.5.0) (2023-02-06)


### Features

* Update JSON schema, add array methods ([e59e2db](https://github.com/dany-fedorov/caught-object-report-json/commit/e59e2db8866320013a3d9fdd8b4b33f81aca0e32))

## [6.4.3](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.4.2...v6.4.3) (2023-01-31)

## [6.4.2](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.4.1...v6.4.2) (2023-01-31)

## [6.4.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.4.0...v6.4.1) (2023-01-31)

# [6.4.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.3.1...v6.4.0) (2023-01-31)


### Features

* Opt out of onCaughtMaking default behavior with null ([f5ab890](https://github.com/dany-fedorov/caught-object-report-json/commit/f5ab890bc485ec26197c7ea8040edab463c35b94))

## [6.3.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.3.0...v6.3.1) (2023-01-31)

# [6.3.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.2.2...v6.3.0) (2023-01-31)


### Bug Fixes

* Fix docs gen ([6197cfb](https://github.com/dany-fedorov/caught-object-report-json/commit/6197cfb068434bf20165089a690072eb2bc31ed3))


### Features

* Add configuring metadata for children ([8e31935](https://github.com/dany-fedorov/caught-object-report-json/commit/8e319352e375e1c0f2e5bebe81604655524578fb))

## [6.2.2](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.2.1...v6.2.2) (2023-01-30)

## [6.2.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.2.0...v6.2.1) (2023-01-29)

# [6.2.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.1.1...v6.2.0) (2023-01-29)


### Features

* Exclude children sources from as_json ([460cc45](https://github.com/dany-fedorov/caught-object-report-json/commit/460cc45ba7f59ee718366c0acfcfe9943601e875))

## [6.1.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.1.0...v6.1.1) (2023-01-29)

# [6.1.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.0.5...v6.1.0) (2023-01-29)


### Features

* Conditionally print "Muffling error" message ([20a1cc6](https://github.com/dany-fedorov/caught-object-report-json/commit/20a1cc68ef283a73c355c54c13d96acd609528d7))

## [6.0.5](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.0.4...v6.0.5) (2023-01-29)

## [6.0.4](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.0.3...v6.0.4) (2023-01-29)

## [6.0.3](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.0.2...v6.0.3) (2023-01-29)


### Bug Fixes

* Fix children_omitted_reason field ([86914aa](https://github.com/dany-fedorov/caught-object-report-json/commit/86914aa2e16c33cc411af2bd3c8a2d98d7c404de))

## [6.0.2](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.0.1...v6.0.2) (2023-01-28)

## [6.0.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v6.0.0...v6.0.1) (2023-01-28)

# [6.0.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v5.0.0...v6.0.0) (2023-01-28)


### Bug Fixes

* Fix and decompose schema ([6894c89](https://github.com/dany-fedorov/caught-object-report-json/commit/6894c89aca560d8fb3aff29bcaa826325db3b9a8))


### Features

* Flatten nested error objects ([c88f7fd](https://github.com/dany-fedorov/caught-object-report-json/commit/c88f7fd4814bc01ab6cbf24a126a692cc92882fb))


### BREAKING CHANGES

* Overhaul of all APIs

# [5.0.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.1.5...v5.0.0) (2023-01-24)


### Features

* Add `errors` and `cause` fields, add separate metadata fields ([674cab4](https://github.com/dany-fedorov/caught-object-report-json/commit/674cab4662eae02de3ac7c258ae0333487dedf39))


### BREAKING CHANGES

* Changed options type, removed _m from report

## [4.1.5](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.1.4...v4.1.5) (2023-01-22)

## [4.1.4](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.1.3...v4.1.4) (2023-01-21)

## [4.1.3](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.1.2...v4.1.3) (2023-01-21)

## [4.1.2](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.1.1...v4.1.2) (2023-01-21)

## [4.1.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.1.0...v4.1.1) (2023-01-20)


### Bug Fixes

* Make _m optional in the type + fix docs ([62b60d7](https://github.com/dany-fedorov/caught-object-report-json/commit/62b60d7c1bee97d49dff94f0074a6dde5d419422))

# [4.1.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.0.5...v4.1.0) (2023-01-20)


### Features

* Bring back corj/ prefix ([8389588](https://github.com/dany-fedorov/caught-object-report-json/commit/8389588b02b99fd08a9e1087f3bd532d5c9f7ee8))

## [4.0.5](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.0.4...v4.0.5) (2023-01-20)

## [4.0.4](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.0.3...v4.0.4) (2023-01-19)

## [4.0.3](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.0.2...v4.0.3) (2023-01-19)

## [4.0.2](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.0.1...v4.0.2) (2023-01-19)

## [4.0.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v4.0.0...v4.0.1) (2023-01-19)

# [4.0.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v3.0.3...v4.0.0) (2023-01-19)


### Features

* Add `| null` to report type ([6893e6b](https://github.com/dany-fedorov/caught-object-report-json/commit/6893e6b8fa9c1154396b666d99b5b90b9730f891))
* Be paranoid about user input ([b9034c6](https://github.com/dany-fedorov/caught-object-report-json/commit/b9034c67a3e55242bb5baf0e22cbb243945b1936))
* Go full paranoid expecting caught?.constructor?.name can throw ([4c5962f](https://github.com/dany-fedorov/caught-object-report-json/commit/4c5962fbb3cf16ef6b814530fbb3a0d7aa297765))
* Make a flat json ([602baf2](https://github.com/dany-fedorov/caught-object-report-json/commit/602baf209b2a1cbafe0ca9081613d11b7b1ebeb0))
* Move schema-versions to a nested dir (technically a breaking change, but I doubt it will actually break something) ([050cd21](https://github.com/dany-fedorov/caught-object-report-json/commit/050cd2105d41233a3d1ddfe840e6b40defaf5150))


### BREAKING CHANGES

* Make json flat
* Now schema for constructor_name, message and stack
includes possibility of null, because accessing this info on unknown
error can potentially throw.

## [3.0.3](https://github.com/dany-fedorov/caught-object-report-json/compare/v3.0.2...v3.0.3) (2023-01-16)

## [3.0.2](https://github.com/dany-fedorov/caught-object-report-json/compare/v3.0.1...v3.0.2) (2023-01-14)

## [3.0.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v3.0.0...v3.0.1) (2023-01-11)

# [3.0.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v2.0.1...v3.0.0) (2023-01-11)


### Features

* Change prop name ([7f62608](https://github.com/dany-fedorov/caught-object-report-json/commit/7f626084249b6980412be93df75cd6a7499b9a10))


### BREAKING CHANGES

* "is_error_instance" is changed to "instanceof_error" to align with
"typeof" property name

## [2.0.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v2.0.0...v2.0.1) (2023-01-08)

# [2.0.0](https://github.com/dany-fedorov/caught-object-report-json/compare/v1.0.3...v2.0.0) (2023-01-08)


### Features

* Use simpler prop names - stack and message ([2d5cff6](https://github.com/dany-fedorov/caught-object-report-json/commit/2d5cff60d79ce5bf05038b03c5c36ee54c27e9d6))


### BREAKING CHANGES

* - `stack_prop` -> `stack`
- `message_prop` -> `message`
- `v` is not `corj/0.2`

## [1.0.3](https://github.com/dany-fedorov/caught-object-report-json/compare/v1.0.2...v1.0.3) (2023-01-02)

## [1.0.2](https://github.com/dany-fedorov/caught-object-report-json/compare/v1.0.1...v1.0.2) (2023-01-02)

## [1.0.1](https://github.com/dany-fedorov/caught-object-report-json/compare/v1.0.0...v1.0.1) (2023-01-02)

# 1.0.0 (2023-01-02)


### Bug Fixes

* Do not use syntax for BigInt ([e295aa3](https://github.com/dany-fedorov/caught-object-report-json/commit/e295aa3c6a89fb00db2dd69e31ee13192fea2f79))


### Features

* First release with semantic-release ([9911513](https://github.com/dany-fedorov/caught-object-report-json/commit/991151325e4ca5e7f46ae15238d5652b74f15965))
