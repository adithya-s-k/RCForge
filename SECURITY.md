# Security policy

## Supported code

RCForge is early experimental software. Security fixes target the current default branch; no older release line has a security-support commitment.

## Report a vulnerability privately

Use [GitHub's private vulnerability reporting form](https://github.com/adithya-s-k/RCForge/security/advisories/new). Include the affected revision, reproduction steps, expected impact, browser/OS and a minimal example where possible. Do not include credentials, unrelated personal data or private flight logs.

If that form is unavailable, use a private contact method listed on the repository owner's [GitHub profile](https://github.com/adithya-s-k). If none is listed, open a minimal issue requesting a security contact **without** exploit details. There is no guaranteed response time or bug-bounty program.

## Relevant boundaries

RCForge is a local static web application with no required backend, account or AI key. Aircraft imports, recordings, controller profiles and serial messages are untrusted data and should be validated. Hardware access is requested through browser permissions. Downloaded files, external design references and coding-agent instructions must not be treated as executable trusted content.

Browser/operating-system permissions and physical receiver failsafe behavior are separate concerns. Report data-validation, code-execution, permission or privacy vulnerabilities here. Ordinary aircraft inaccuracies, crashes of the simulated aircraft and feature requests belong in the normal issue tracker, with the model and reproduction steps.
