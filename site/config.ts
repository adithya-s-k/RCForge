/** One deliberate navigation tree. Markdown remains readable directly in Git. */
export const pages = [
  {
    slug: "",
    title: "Welcome",
    group: "Start here",
    file: "docs/README.md",
  },
  {
    slug: "getting-started",
    title: "Your first flight",
    group: "Start here",
    file: "docs/getting-started.md",
  },
  {
    slug: "flight-guide",
    title: "Views & flight setup",
    group: "Start here",
    file: "docs/flight-guide.md",
  },
  {
    slug: "troubleshooting",
    title: "Fix a problem",
    group: "Start here",
    file: "docs/troubleshooting.md",
  },
  {
    slug: "controllers",
    title: "Keyboard & controllers",
    group: "Connect your controls",
    file: "docs/controllers.md",
  },
  {
    slug: "radio-setup",
    title: "Choose a radio connection",
    group: "Connect your controls",
    file: "docs/radio-setup.md",
  },
  {
    slug: "trainer-nano",
    title: "FS-i6 trainer → Nano",
    group: "Connect your controls",
    file: "docs/trainer-nano.md",
  },
  {
    slug: "fs-i6-ia6b-nano-setup",
    title: "Receiver → Nano · unverified",
    group: "Connect your controls",
    file: "docs/fs-i6-ia6b-nano-setup.md",
  },
  {
    slug: "flysky-fs-i6",
    title: "Wiring & protocol reference",
    group: "Connect your controls",
    file: "docs/flysky-fs-i6.md",
  },
  {
    slug: "aircraft-editor",
    title: "Edit, balance & save",
    group: "Customize aircraft",
    file: "docs/aircraft-editor.md",
  },
  {
    slug: "fpv-and-control-setup",
    title: "Cameras, rates & mixing",
    group: "Customize aircraft",
    file: "docs/fpv-and-control-setup.md",
  },
  {
    slug: "bronco-vtol",
    title: "Bronco tricopter VTOL",
    group: "Customize aircraft",
    file: "docs/bronco-vtol.md",
  },
  {
    slug: "multirotors",
    title: "Quadcopters",
    group: "Customize aircraft",
    file: "docs/multirotors.md",
  },
  {
    slug: "plans",
    title: "Aircraft plans & credits",
    group: "Customize aircraft",
    file: "docs/plans.md",
  },
  {
    slug: "validation",
    title: "Realism & known limits",
    group: "Understand the simulation",
    file: "docs/validation.md",
  },
  {
    slug: "physics-validation",
    title: "Run physics experiments",
    group: "Understand the simulation",
    file: "docs/physics-validation.md",
  },
  {
    slug: "aircraft-authoring",
    title: "Aircraft file format",
    group: "Understand the simulation",
    file: "docs/aircraft-authoring.md",
  },
  {
    slug: "component-models",
    title: "How components are modeled",
    group: "Understand the simulation",
    file: "docs/component-models.md",
  },
  {
    slug: "component-catalog",
    title: "Component catalog sources",
    group: "Understand the simulation",
    file: "components/README.md",
  },
  {
    slug: "flite-test-reconstruction",
    title: "Flite Test model references",
    group: "Understand the simulation",
    file: "docs/flite-test-reconstruction.md",
  },
  {
    slug: "vortex-simple-trainer",
    title: "Simple Trainer references",
    group: "Understand the simulation",
    file: "docs/vortex-simple-trainer.md",
  },
  {
    slug: "realism-plan",
    title: "Physics research plan",
    group: "Understand the simulation",
    file: "docs/realism-plan.md",
  },
  {
    slug: "scenery-rendering",
    title: "How scenery is rendered",
    group: "Understand the simulation",
    file: "docs/scenery-rendering.md",
  },
  {
    slug: "contributing",
    title: "Make your first contribution",
    group: "Contribute & maintain",
    file: "CONTRIBUTING.md",
  },
  {
    slug: "agent-workflow",
    title: "Work with a coding agent",
    group: "Contribute & maintain",
    file: "docs/agent-workflow.md",
  },
  {
    slug: "architecture",
    title: "Codebase architecture",
    group: "Contribute & maintain",
    file: "docs/architecture.md",
  },
  {
    slug: "versioning",
    title: "Versions & releases",
    group: "Contribute & maintain",
    file: "docs/versioning.md",
  },
  {
    slug: "deployment",
    title: "Build & host the site",
    group: "Contribute & maintain",
    file: "docs/deployment.md",
  },
  {
    slug: "documentation",
    title: "Edit the documentation",
    group: "Contribute & maintain",
    file: "docs/documentation.md",
  },
  {
    slug: "roadmap",
    title: "Roadmap",
    group: "Project reference",
    file: "docs/roadmap.md",
  },
  {
    slug: "changelog",
    title: "Changelog",
    group: "Project reference",
    file: "CHANGELOG.md",
  },
  {
    slug: "scenery-assets",
    title: "Scenery assets & licenses",
    group: "Project reference",
    file: "public/scenery/README.md",
  },
  {
    slug: "credits",
    title: "Third-party notices",
    group: "Project reference",
    file: "THIRD_PARTY_NOTICES.md",
  },
  {
    slug: "agent-contract",
    title: "Agent instructions",
    group: "Project reference",
    file: "AGENTS.md",
  },
  {
    slug: "code-of-conduct",
    title: "Code of conduct",
    group: "Project reference",
    file: "CODE_OF_CONDUCT.md",
  },
  {
    slug: "security",
    title: "Report a security issue",
    group: "Project reference",
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
