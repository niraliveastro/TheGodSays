module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "script",
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    "quotes": ["error", "double"],
  },
};
