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
