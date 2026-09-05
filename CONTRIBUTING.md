# Contributing to STARTcloud UI

Thank you for your interest in contributing to STARTcloud UI! Community contributions are essential to the project's continued growth.

## Important Note on Resources

STARTcloud UI is maintained with limited development resources. **Community contributions directly impact the pace of feature development and bug fixes.**

## How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Use the appropriate issue template** (bug report, feature request, etc.)
3. **Provide detailed information** — steps to reproduce, expected vs. actual behavior
4. **Include environment details** (browser + version, OS, Node.js version, which app was serving the UI)

### Submitting Pull Requests

1. **Fork the repository** and create your feature branch from `main`
2. **Follow the existing code style** — ESLint + Prettier enforce it (`npm run quality`)
3. **Keep changes focused** and write clear commit messages using [Conventional Commits](https://www.conventionalcommits.org/) (release-please relies on them)
4. **Fill out the pull request template** completely

### Development Setup

1. Clone your fork of the repository
2. Install dependencies: `npm install`
3. Point the dev proxy at a backend in `config.yaml` (`server.api_target`)
4. Start the dev server: `npm run dev`, then open [localhost:8080](http://localhost:8080)

### Code Style Guidelines

- Follow existing React / JavaScript conventions
- **ESLint** (strict React + hooks + jsx-a11y + import rules) and **Prettier** enforce style — run `npm run quality` / `npm run fix`
- The tree is feature-first (`src/app`, `components`, `features`, `hooks`, `contexts`, `lib`, `utils`, `config`); there is no per-app code, anything one host differs in arrives in its `/api/status` and is gated with `hasFeature`
- Every string goes through i18next; add it to every language under `public/locales`

### What We're Looking For

**High Impact Contributions:**

- Bug fixes (especially state/rendering and accessibility issues)
- Accessibility (jsx-a11y) and UX improvements
- Performance improvements (bundle size, render performance)
- Documentation improvements

**Feature Contributions:**

- New views and components
- Better error handling and empty/loading states
- Improved theming and responsiveness

## Response Times and Review Process

Due to limited development resources:

- **Issue responses**: we aim to acknowledge new issues within a few days
- **Pull request reviews**: may take time depending on complexity and workload
- **Documentation updates**: generally reviewed quickly as they're high-impact, low-risk

## Recognition

All contributors are recognized in our [AUTHORS.md](AUTHORS.md) file. We appreciate every contribution, from small fixes to major features!

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms.

## License

By contributing to STARTcloud UI, you agree that your contributions will be licensed under the [GPL-3.0 License](LICENSE.md).
