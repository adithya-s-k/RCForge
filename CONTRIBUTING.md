# Contributing to RCForge

Contributions from builders, pilots, developers, artists and coding-agent users are welcome. Start with something you can demonstrate: an aircraft, measured component data, a reproducible bug, a controller setup, a clearer workflow or an improvement to the simulation.

## Find a useful first contribution

- **Reproduce a bug:** include exact steps, aircraft definition, browser/OS and a recording if relevant.
- **Document hardware:** record your transmitter/receiver/adapter, board, firmware and tested channel mapping. A hardware report can be valuable without a code change.
- **Improve an aircraft:** provide dimensions, mass/CG measurements, thrust data or an explained geometry correction with source and uncertainty.
- **Improve usability:** keyboard access, clear control names, smaller-screen layout and fewer steps to complete a task.
- **Improve physics:** begin with a specific behavior and a testable physical expectation or measured dataset.

Use the [issue templates](https://github.com/adithya-s-k/RCForge/issues/new/choose). Open an issue before a large feature or compatibility change so the design and scope can be discussed. Small fixes and documentation improvements can go directly to a pull request. There is no requirement to use a coding agent.

## From fork to running simulator

You need Git, a GitHub account to submit a pull request, and a supported Node version from `package.json` (Node 24 is a convenient default). Trying RCForge locally does not need an account.

1. Open [RCForge on GitHub](https://github.com/adithya-s-k/RCForge) and select **Fork**. Keep the default repository name.
2. Replace `YOUR_GITHUB_USERNAME` below, then run:

```sh
git clone https://github.com/YOUR_GITHUB_USERNAME/RCForge.git
cd RCForge
git remote add upstream https://github.com/adithya-s-k/RCForge.git
git switch -c feat/my-change
npm ci
npm run dev
```

3. Open the URL Vite prints. Change a source file and the workbench updates locally. No API keys, AI services or backend setup are required.
4. Read [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md), then the task's guide in the [docs index](docs/README.md). A coding agent can use the same instructions; it is optional.

`origin` is your fork; `upstream` is the shared RCForge repository. Give your branch a descriptive name such as `fix/controller-labels` or `feat/my-trainer`. Work on that branch so your main branch stays easy to update.

## An aircraft contribution, end to end

1. Start from a bundled aircraft or import a definition in **Aircraft → Import JSON**. Use **History → Save version** to keep a checkpoint before experimenting.
2. Adjust the airframe, components and controls. Inspect the 3D model and use **Control test** to verify surface direction and travel. Use **Apply & fly**, and compare scenarios in **Experiments**. History can restore an earlier setup into your draft without applying it.
3. **Export** the final aircraft JSON from the editor. Browser edits and checkpoints do not rewrite repository files. A `.history.json` archive is a personal backup; do not commit it as an aircraft definition.
4. For a new aircraft, give it a unique `id`, descriptive name and source/assumption metadata. Save the ordinary definition as `aircraft/your-aircraft-id.json`. Follow [aircraft authoring](docs/aircraft-authoring.md) and [component models](docs/component-models.md); read [multirotors](docs/multirotors.md) for a quad.
5. Validate and simulate it. Replace the example path with your file:

```sh
npm run aircraft:validate -- aircraft/your-aircraft-id.json
npm run simulate -- aircraft/your-aircraft-id.json --scenario cruise --duration 20 --out results/my-aircraft
npm run physics:envelope
```

6. If it should be in the built-in catalog, add an explicit JSON import and an entry in `bundledAircraft` in `src/app/bundled-aircraft.ts`. Import-only aircraft do not need a catalog code change. Add relevant regression checks and a model guide identifying sourced, calculated and estimated values.
7. Include a rendered screenshot, the behavior you checked, and material limitations in the PR. Plans establish dimensions, not measured aerodynamic coefficients. Passing numerical checks does not establish real-flight fidelity.

For a bug fix or UI contribution, the same branch/check/PR flow applies. Include the smallest reproduction and the observed before/after behavior.

## Make a focused change

Keep the scope small enough to explain and review. Use SI units, preserve the fixed timestep, and keep the physics core independent of the browser and Three.js. New dependencies should solve a concrete need that existing tools cannot address simply.

Include source and uncertainty for aircraft and component values. Do not fill missing data with another preset's values and claim validation. Imported designs and art need clear provenance and redistribution terms; link upstream plans instead of committing copyrighted PDFs or reference photos without permission. Follow [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for asset credits.

Add behavior tests for dynamics, input, schema and compatibility changes. A screenshot demonstrates appearance, not physical correctness. Keep generated output and temporary files out of the patch.

## Check your work

```sh
npm run check
npm run docs:check
npm run references:check
npm run format:check
```

For physics changes, also run `npm run physics:validate` and a relevant scenario/replay. For UI changes, follow the [browser acceptance checks](docs/validation.md#browser-acceptance). For Arduino changes, run `bash scripts/check-arduino.sh` after installing Arduino CLI and the AVR core. No hardware is needed for compilation, but hardware claims require physical testing.

Run `npm run format` to apply formatting. If a check cannot run, explain the missing dependency or hardware and what you verified instead. Do not represent an unrun check as passing.

## Documentation and design references

Edit the existing Markdown guide; the website renders that same file at `/docs/`. New public guides need an entry in `site/config.ts`. Follow [documentation maintenance](docs/documentation.md) for previews and link checks. Release snapshots are maintained separately; ordinary contributions update current docs only.

For plan-based aircraft, add creator links to `credit`, parameter evidence to `provenance`, and source identity to `references/manifest.json` when a reviewed public PDF exists. Use `npm run references:fetch` to inspect existing plans locally. Keep originals in the ignored `references/local/` folder unless redistribution permission has been established and reviewed. Never substitute a new hash just to make a changed source pass. See [plans & design credits](docs/plans.md).

## Submit and iterate on a pull request

1. Run the checks above and inspect `git diff`. Commit only intended source, tests, docs and permitted assets. Use explicit paths rather than adding generated files:

```sh
git status --short
git diff
git add path/to/changed-file path/to/another-file
git commit -m "Explain the concrete change"
git push -u origin feat/my-change
```

Replace the paths and branch name with yours. Use several focused commits when they help separate behavior, tests and documentation. Do not commit `dist/`, `results/`, dependencies, local history backups or credentials.

2. Open your fork on GitHub and choose **Compare & pull request**. Set the base to **adithya-s-k/RCForge · main** and compare to your branch.
3. Fill in the PR template: what changed and why, exact checks run, source/license information, and what remains unverified. Link the issue if there is one. Screenshots help reviewers with UI or model changes.
4. Address review comments on the **same branch**, commit, and `git push`. The PR updates automatically. Explain checks that could not run; do not report them as passing.
5. After merge, update your local main branch:

```sh
git switch main
git fetch upstream
git merge --ff-only upstream/main
git push origin main
```

If a fast-forward is not possible, inspect the divergent commits rather than force-pushing or discarding work. Start your next contribution from the updated main branch.

Maintainers review scope, implementation, evidence and licensing; passing CI is required but does not guarantee acceptance. Large or compatibility-changing work benefits from an issue discussion first. Small documentation and usability fixes can go straight to a PR.

**Do not bump the release number in an ordinary contribution.** Maintainers coordinate application releases and separately review changes to aircraft format or physics/replay compatibility. See [the versioning and release workflow](docs/versioning.md#maintainer-release-workflow).

### Contributions made with agents

Agents are welcome. Read [the agent workflow](docs/agent-workflow.md), inspect the resulting diff and run the checks yourself or through the agent. Be transparent about what was actually tested, including any hardware you did or did not use. You remain responsible for the contribution's correctness, sources and licensing; generated explanations do not replace evidence.

## Community and security

Follow the [code of conduct](CODE_OF_CONDUCT.md). Discuss changes respectfully, focus criticism on the work and make room for people learning RC flight or software development.

Report a potential security issue using [SECURITY.md](SECURITY.md), rather than posting exploit details or private data in a public issue. Normal simulation inaccuracies and feature requests belong in the issue tracker.

## License

By contributing, you agree that your original code is provided under the repository's MIT license. Preserve third-party notices and identify material with separate terms. This does not transfer ownership of upstream designs or permit relicensing their plans, images or trademarks.
