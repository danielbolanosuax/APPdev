// .eslintrc.cjs
/* eslint-env node */
module.exports = {
  root: true,
  ignores: ["dist", "build", "coverage"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  settings: { react: { version: "detect" } },
  rules: {
    "react/react-in-jsx-scope": "off",
    "import/order": [
      "warn",
      {
        "groups": ["builtin", "external", "internal", ["parent","sibling","index"]],
        "newlines-between": "always"
      }
    ],
    "@typescript-eslint/consistent-type-imports": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
};
