[![Build Status](https://travis-ci.com/utilitycss/extract-used-atoms-webpack-plugin.svg?branch=master)](https://travis-ci.com/utilitycss/atomic)

# extract-used-atoms-webpack-plugin
Create a CSS file with only the used classes from an
[atomic](https://github.com/utilitycss/atomic) bundle.

When your atomic bundle is used in the context of a single build pipeline, its
size can be greatly reduced by only including the used classes. This can also
be useful to generate small self contained components with a minimal set of
needed CSS.

## Installation
```
$ yarn install @utilitycss/extract-used-atoms-webpack-plugin
```

## Usage
In your webpack config `plugins` section add:

```js
new ExtractUsedAtoms({
  filename: "used-atoms",
  scope: "@dx",
  cssBundle: "@dx/all",
  excluded: ["@dx/mocks"],
})
```

where:
- `filename` is the name for the generated CSS assets
- `scope` is the scope of your atom packages.
- `cssBundle` [required] is your "all" atom generated package
- `excluded` is a list of strings or RegExp of packages to exclude
