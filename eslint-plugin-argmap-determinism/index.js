import noUnsortedIteration from "./rules/no-unsorted-iteration.js";

const plugin = {
  meta: { name: "eslint-plugin-argmap-determinism", version: "0.1.0" },
  rules: {
    "no-unsorted-iteration": noUnsortedIteration,
  },
};

export default plugin;
