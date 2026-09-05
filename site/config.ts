/** One deliberate navigation tree. Markdown remains readable directly in Git. */
export const pages = [
  { slug: "", title: "Overview", group: "Start here", file: "docs/README.md" },
  {
    slug: "getting-started",
    title: "Install & first flight",
    group: "Start here",
    file: "docs/getting-started.md",
  },
  {
    slug: "controllers",
    title: "Controls & calibration",
    group: "Start here",
    file: "docs/controllers.md",
  },
  {
    slug: "radio-setup",
    title: "Connect a radio · visual guide",
    group: "Start here",
    file: "docs/radio-setup.md",
  },
  {
    slug: "fs-i6-ia6b-nano-setup",
    title: "FS-i6 + iA6B + Nano · step by step",
    group: "Start here",
    file: "docs/fs-i6-ia6b-nano-setup.md",
  },
  {
    slug: "aircraft-editor",
    title: "Edit & save an aircraft",
    group: "Start here",
    file: "docs/aircraft-editor.md",
  },
  {
    slug: "aircraft-authoring",
    title: "Aircraft definitions",
    group: "Build aircraft",
    file: "docs/aircraft-authoring.md",
  },
  {
    slug: "component-models",
    title: "Components & batteries",
    group: "Build aircraft",
    file: "docs/component-models.md",
  },
  {
    slug: "bronco-vtol",
    title: "Tricopter VTOL",
    group: "Build aircraft",
    file: "docs/bronco-vtol.md",
  },

  {
    slug: "multirotors",
    title: "Quadcopters",
    group: "Build aircraft",
    file: "docs/multirotors.md",
  },
  {
    slug: "fpv-and-control-setup",
    title: "FPV, rates & mixing",
    group: "Build aircraft",
    file: "docs/fpv-and-control-setup.md",
  },
  {
    slug: "plans",
    title: "Plans & design credits",
    group: "Build aircraft",
    file: "docs/plans.md",
  },
  {
    slug: "contributing",
    title: "Contribute",
    group: "Develop",
    file: "CONTRIBUTING.md",
  },
  {
    slug: "agent-workflow",
    title: "Work with an agent",
    group: "Develop",
    file: "docs/agent-workflow.md",
  },
  {
    slug: "architecture",
    title: "Codebase & architecture",
    group: "Develop",
    file: "docs/architecture.md",
  },
  {
    slug: "physics-validation",
    title: "Run physics checks",
    group: "Develop",
    file: "docs/physics-validation.md",
  },
  {
    slug: "versioning",
    title: "Versions & local history",
    group: "Develop",
    file: "docs/versioning.md",
  },
  {
    slug: "deployment",
    title: "Release & hosting",
    group: "Develop",
    file: "docs/deployment.md",
  },
  {
    slug: "documentation",
    title: "Maintain these docs",
    group: "Develop",
    file: "docs/documentation.md",
  },
  {
    slug: "flysky-fs-i6",
    title: "FlySky FS-i6 & Arduino",
    group: "Reference",
    file: "docs/flysky-fs-i6.md",
  },
  {
    slug: "validation",
    title: "Model limits & evidence",
    group: "Reference",
    file: "docs/validation.md",
  },
  {
    slug: "flite-test-reconstruction",
    title: "Flite Test reconstructions",
    group: "Reference",
    file: "docs/flite-test-reconstruction.md",
  },
  {
    slug: "vortex-simple-trainer",
    title: "Vortex Simple Trainer",
    group: "Reference",
    file: "docs/vortex-simple-trainer.md",
  },
  {
    slug: "component-catalog",
    title: "Component catalog sources",
    group: "Reference",
    file: "components/README.md",
  },
  {
    slug: "scenery-rendering",
    title: "Scenery rendering",
    group: "Reference",
    file: "docs/scenery-rendering.md",
  },
  {
    slug: "scenery-assets",
    title: "Scenery assets & licenses",
    group: "Reference",
    file: "public/scenery/README.md",
  },
  {
    slug: "realism-plan",
    title: "Physics research",
    group: "Reference",
    file: "docs/realism-plan.md",
  },
  {
    slug: "roadmap",
    title: "Roadmap",
    group: "Reference",
    file: "docs/roadmap.md",
  },
  {
    slug: "credits",
    title: "Third-party notices",
    group: "Reference",
    file: "THIRD_PARTY_NOTICES.md",
  },
  {
    slug: "changelog",
    title: "Changelog",
    group: "Reference",
    file: "CHANGELOG.md",
  },
  {
    slug: "agent-contract",
    title: "Agent instructions",
    group: "Reference",
    file: "AGENTS.md",
  },
  {
    slug: "code-of-conduct",
    title: "Code of conduct",
    group: "Reference",
    file: "CODE_OF_CONDUCT.md",
  },
  {
    slug: "security",
    title: "Security",
    group: "Reference",
    file: "SECURITY.md",
  },
] as const;
export type DocPage = {
  slug: string;
  title: string;
  group: string;
  file: string;
};
export const REPOSITORY = "https://github.com/adithya-s-k/RCForge";
export const CANONICAL = "https://rcforge.adithyask.com";
