/** Search metadata describes capabilities, never unmeasured flight fidelity. */
import { CANONICAL, REPOSITORY, type DocPage } from "./config.ts";
import { docUrl, escapeHtml as e } from "./markdown.ts";

export const siteTitle = "RCForge — Free, Open-Source RC Flight Simulator";
export const siteDescription =
  "A free, open-source RC flight simulator in your browser. Customize aircraft, components, controls and environments, or build on your own plans.";
export const socialImage = `${CANONICAL}/brand/rcforge-social.png`;
export const socialImageAlt =
  "RCForge: free, open-source RC flight simulator. Your aircraft, components, controls and environments.";

// Production uses clean URLs without a trailing slash (except the site root).
export function canonicalUrl(path: string) {
  return CANONICAL + (path === "/" ? path : path.replace(/\/$/, ""));
}
export function jsonLd(value: unknown) {
  return `<script type="application/ld+json">${JSON.stringify(value).replace(/</g, "\\u003c")}</script>`;
}
export function socialTags(title: string, description: string, url: string) {
  return `<meta property="og:type" content="website">
<meta property="og:site_name" content="RCForge">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${e(url)}">
<meta property="og:image" content="${socialImage}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${socialImageAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(description)}">
<meta name="twitter:image" content="${socialImage}">
<meta name="twitter:image:alt" content="${socialImageAlt}">`;
}
const descriptions: Record<string, string> = {
  "": siteDescription,
  "getting-started":
    "Start flying RCForge for free in your browser or run it locally. Learn keyboard controls, launch, pause and reset your first RC aircraft flight.",
  "flight-guide":
    "Set up your RCForge flight: choose scenery, place the aircraft and pilot, adjust wind, and switch between pilot, chase and FPV camera views.",
  troubleshooting:
    "Fix RCForge launch, aircraft, browser and controller issues. Check mapping, calibration, USB serial connections and signal-loss recovery.",
  controllers:
    "Fly RCForge with a keyboard, gamepad, flight stick or RC transmitter. Map axes, calibrate endpoints and check input before flying.",
  "radio-setup":
    "Connect your RC transmitter to RCForge with a USB simulator adapter or Arduino PPM bridge. Compare routes, wiring, firmware and test status.",
  "trainer-nano":
    "Connect a FlySky FS-i6 trainer PPM output to a classic Arduino Nano. Follow the wiring diagram, load firmware and verify the CH6 RUN guard.",
  "fs-i6-ia6b-nano-setup":
    "FS-i6 and FS-iA6B receiver-to-Nano setup guide: binding, PPM/PWM wiring and RCForge firmware. Receiver connections still need hardware testing.",
  "flysky-fs-i6":
    "FlySky FS-i6 wiring and RCForge bridge reference: trainer PPM, receiver PPM/PWM, Arduino firmware, RCF1 serial protocol and signal-loss checks.",
  "aircraft-editor":
    "Customize RC aircraft in RCForge. Change components, move the center of gravity, inspect balance and save or export local aircraft versions.",
  "fpv-and-control-setup":
    "Place an FPV camera and tune RCForge control rates, expo, servo travel and mixing. Preview control surfaces before applying changes to flight.",
  "bronco-vtol":
    "Explore RCForge's experimental Bronco tricopter VTOL: front tilt motors, rear yaw servo, transition controls, component placement and model limits.",
  multirotors:
    "Customize RCForge Quad X drones with motor, propeller and battery parameters. Understand multirotor controls, mass, thrust and modeling limits.",
  plans:
    "Find original RC aircraft plans, designer websites and credits for RCForge presets. Learn how reference geometry becomes an editable aircraft model.",
  validation:
    "Understand RCForge's flight-model assumptions, unmeasured parameters and known limits. Software tests are not evidence of real-aircraft equivalence.",
  "physics-validation":
    "Run deterministic RCForge physics experiments, inspect trim and flight envelopes, and compare telemetry when changing aircraft definitions.",
  "aircraft-authoring":
    "Bring your aircraft design to RCForge with validated JSON definitions: geometry, components, mass, inertia, controls and source attribution.",
  "component-models":
    "How RCForge models aircraft components: batteries, motors, propellers, servos, mass, center of gravity and inertia. Separate estimates from measurements.",
  "component-catalog":
    "Browse the sources and assumptions behind RCForge's RC component catalog, including batteries, motors, propellers and servos.",
  "flite-test-reconstruction":
    "References and assumptions for RCForge's Flite Test aircraft models, including Tiny Trainer, FT-22 and Bronco geometry and control surfaces.",
  "vortex-simple-trainer":
    "Source references, geometry and modeling assumptions for the Vortex RC Simple Trainer preset in RCForge's free RC flight simulator.",
  "realism-plan":
    "RCForge's physics research plan: evidence, aerodynamic modeling, parameter uncertainty and validation work needed to improve the simulator.",
  "scenery-rendering":
    "How RCForge renders flying fields, terrain, vegetation and sky efficiently in the browser. Learn the boundaries for customizing environments.",
  contributing:
    "Contribute to RCForge, the MIT-licensed RC flight simulator. Fork the code, run checks and submit aircraft, controls, scenery or documentation changes.",
  "agent-workflow":
    "Use your coding agent to contribute to RCForge: inspect the architecture, edit aircraft or components, validate changes and preserve source attribution.",
  architecture:
    "Explore RCForge's TypeScript architecture: flight dynamics, aircraft schema, controller input, Three.js rendering, browser workbench and CLI tools.",
  versioning:
    "Understand RCForge releases, aircraft format versions, recording compatibility and local aircraft history. Follow the maintainer release workflow.",
  deployment:
    "Build and self-host the MIT-licensed RCForge simulator and documentation. The open-source workbench runs without accounts, API keys or a backend.",
  documentation:
    "Edit and publish RCForge's versioned documentation: Markdown guides, visual diagrams, source links, static HTML generation and link checks.",
  roadmap:
    "Explore RCForge's development priorities and open work for its customizable, free and open-source RC aircraft simulation workbench.",
  changelog:
    "Read RCForge release notes and changes to aircraft editing, controls, simulation, documentation and compatibility.",
  "scenery-assets":
    "Source credits and licenses for RCForge scenery assets. Check provenance and reuse requirements before contributing terrain, trees or textures.",
  credits:
    "RCForge third-party credits and licenses for aircraft references, software, fonts and scenery assets. Original creators retain their respective rights.",
  "agent-contract":
    "Instructions for coding agents contributing to RCForge: repository boundaries, physical units, data validation, testing and documentation requirements.",
  "code-of-conduct":
    "RCForge community standards for respectful participation, constructive contributions and reporting unacceptable behavior.",
  security:
    "Report a security issue in RCForge responsibly. Learn the project's disclosure process and how to share a useful reproduction privately.",
};
export function docsMetadata(
  page: DocPage,
  id: string,
  version: string,
  frozen: boolean,
) {
  const title = `${page.slug ? page.title : "Free RC flight simulator: guides & customization"} · RCForge docs${frozen ? ` · ${version}` : ""}`;
  const description =
    descriptions[page.slug] ?? `RCForge documentation: ${page.title}.`;
  const url = canonicalUrl(docUrl(id, page.slug));
  if (page.slug === "not-found")
    return '<title>Page not found · RCForge</title><meta name="robots" content="noindex, follow">';
  return `<title>${e(title)}</title><meta name="description" content="${e(description)}"><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${url}">${socialTags(title, description, url)}${jsonLd(
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url,
      isPartOf: { "@type": "WebSite", name: "RCForge", url: `${CANONICAL}/` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "RCForge",
            item: `${CANONICAL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Documentation",
            item: canonicalUrl(docUrl(id)),
          },
          ...(page.slug
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: page.title,
                  item: url,
                },
              ]
            : []),
        ],
      },
    },
  )}`;
}
export const applicationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${CANONICAL}/#website`,
      name: "RCForge",
      url: `${CANONICAL}/`,
      description: siteDescription,
    },
    {
      "@type": "WebApplication",
      "@id": `${CANONICAL}/#simulator`,
      name: "RCForge",
      url: `${CANONICAL}/`,
      description: siteDescription,
      applicationCategory: "GameApplication",
      operatingSystem: "Web browser",
      browserRequirements: "JavaScript and WebGL2 support required",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      license: `${REPOSITORY}/blob/main/LICENSE`,
      image: socialImage,
      featureList: [
        "Custom aircraft definitions",
        "Component mass and center of gravity",
        "Keyboard, gamepad and RC transmitter input",
        "Editable environments",
        "FPV cameras",
        "Local aircraft history",
      ],
      isBasedOn: {
        "@type": "SoftwareSourceCode",
        name: "RCForge",
        codeRepository: REPOSITORY,
        programmingLanguage: "TypeScript",
        license: `${REPOSITORY}/blob/main/LICENSE`,
      },
    },
  ],
};
export function indexMetadata() {
  return `<title>${siteTitle}</title><meta name="description" content="${siteDescription}"><link rel="canonical" href="${CANONICAL}/"><meta name="robots" content="index, follow, max-image-preview:large">${socialTags(siteTitle, siteDescription, `${CANONICAL}/`)}${jsonLd(applicationSchema)}`;
}
