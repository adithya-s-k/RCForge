# Contributing to RCForge

Contributions from builders, pilots, developers, artists and coding-agent users are welcome. Start with something you can demonstrate: an aircraft, measured component data, a reproducible bug, a controller setup, a clearer workflow or an improvement to the simulation.

## Find a useful first contribution

- **Reproduce a bug:** include exact steps, aircraft definition, browser/OS and a recording if relevant.
- **Document hardware:** record your transmitter/receiver/adapter, board, firmware and tested channel mapping. A hardware report can be valuable without a code change.
- **Improve an aircraft:** provide dimensions, mass/CG measurements, thrust data or an explained geometry correction with source and uncertainty.
- **Improve usability:** keyboard access, clear control names, smaller-screen layout and fewer steps to complete a task.
- **Improve physics:** begin with a specific behavior and a testable physical expectation or measured dataset.

Use the [issue templates](https://github.com/adithya-s-k/RCForge/issues/new/choose). Open an issue before a large feature or compatibility change so the design and scope can be discussed. Small fixes and documentation improvements can go directly to a pull request. There is no requirement to use a coding agent.

## Local development

Fork the repository and clone your fork, or work on a branch if you have repository access. Use a supported Node version from `package.json` (Node 24 is a convenient default):

```sh
npm ci
npm run dev
```

Read [AGENTS.md](AGENTS.md) for architecture contracts and [the docs index](docs/README.md) for the relevant guide. Browser edits live in local storage: export aircraft JSON to make changes reviewable in Git. The project has no required API keys or backend service.

## Make a focused change

Keep the scope small enough to explain and review. Use SI units, preserve the fixed timestep, and keep the physics core independent of the browser and Three.js. New dependencies should solve a concrete need that existing tools cannot address simply.

Include source and uncertainty for aircraft and component values. Do not fill missing data with another preset's values and claim validation. Imported designs and art need clear provenance and redistribution terms; link upstream plans instead of committing copyrighted PDFs or reference photos without permission. Follow [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for asset credits.

Add behavior tests for dynamics, input, schema and compatibility changes. A screenshot demonstrates appearance, not physical correctness. Keep generated output and temporary files out of the patch.

## Check your work

```sh
npm run check
npm run docs:check
npm run format:check
```

For physics changes, also run `npm run physics:validate` and a relevant scenario/replay. For UI changes, follow the [browser acceptance checks](docs/validation.md#browser-acceptance). For Arduino changes, run `bash scripts/check-arduino.sh` after installing Arduino CLI and the AVR core. No hardware is needed for compilation, but hardware claims require physical testing.

Run `npm run format` to apply formatting. If a check cannot run, explain the missing dependency or hardware and what you verified instead. Do not represent an unrun check as passing.

## Submit the pull request

Use several focused commits when they help separate behavior, tests and documentation. Describe the user-visible problem and resulting behavior; include reproducible verification and material limitations. Reference a related issue where one exists.

The PR template asks for the change, validation, provenance and remaining uncertainty. Maintainers may request revisions or more evidence. Breaking changes need an explicit version/migration plan for definitions or recordings. Passing CI is a prerequisite for review, not proof of real-flight fidelity or a promise of acceptance.

### Contributions made with agents

Agents are welcome. Read [the agent workflow](docs/agent-workflow.md), inspect the resulting diff and run the checks yourself or through the agent. Be transparent about what was actually tested, including any hardware you did or did not use. You remain responsible for the contribution's correctness, sources and licensing; generated explanations do not replace evidence.

## Community and security

Follow the [code of conduct](CODE_OF_CONDUCT.md). Discuss changes respectfully, focus criticism on the work and make room for people learning RC flight or software development.

Report a potential security issue using [SECURITY.md](SECURITY.md), rather than posting exploit details or private data in a public issue. Normal simulation inaccuracies and feature requests belong in the issue tracker.

## License

By contributing, you agree that your original code is provided under the repository's MIT license. Preserve third-party notices and identify material with separate terms. This does not transfer ownership of upstream designs or permit relicensing their plans, images or trademarks.
