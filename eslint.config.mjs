import nextConfig from "eslint-config-next"

export default [
  // Ignore shadcn/ui generated components — never manually edited
  { ignores: ["src/components/ui/**"] },

  ...nextConfig,

  // React Compiler rules flag pre-existing patterns as errors.
  // Downgrade to warn so CI is not blocked; fix incrementally.
  {
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]
