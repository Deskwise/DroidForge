# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2024-10-21

### Added
- Intelligent tech stack evaluation and completion system
- Gap detection for missing tools (analytics, testing, deployment, etc.)
- Targeted tech stack recommendations based on user preferences
- Complete tech stack coverage analysis
- Conversational guidance for beginners through experts
- Smart completion questions for complete project stacks

### Changed
- Refined conversation flow to 2-5 concise questions max
- Enhanced conversation system with real-time tech stack assessment
- Improved confidence scoring for faster, more accurate completion
- Better domain-specific droid generation based on complete tech stacks
- Updated documentation with tech stack evaluation examples

### Fixed
- Optimized conversation termination threshold for quicker completion
- Improved tech stack parsing and recognition
- Enhanced user experience for both beginners and experts

## [0.2.0] - 2024-10-21

### Added
- Natural language project analysis system
- Domain-specific droid generation (dental, restaurant, fitness, e-commerce)
- Automatic technical level detection from user descriptions
- Natural language conversational analysis
- Specialized contextual droids for common business domains

### Changed
- Replaced form-based interview system with natural language analysis
- Simplified user interaction from multiple questions to single description
- Enhanced droid planning to use domain-specific analysis
- Updated all documentation to reflect natural language approach

### Fixed
- Missing templates directory causing initialization failures
- Dynamic version detection in CLI output
- Removed all bootstrap/form references from codebase
- Fixed package.json to include templates in distribution

## [Unreleased]

### Added
- Performance optimization with cached scanning
- Conflict detection and resolution system
- Comprehensive test suite
- Advanced documentation and tutorials

### Changed
- Improved error handling and validation
- Enhanced CLI user experience with progress indicators
- Optimized TypeScript compilation

### Fixed
- Fixed micromatch import compatibility issues
- Resolved Promise.all type assertion problems
- Corrected conflict resolution interface naming

## [0.1.0] - 2024-10-21

### Added
- Initial release of DroidForge CLI tool
- Form-based interview system for project analysis
- Repository scanning and signal detection
- Droid generation with scoped tools and permissions
- Global orchestrator installation and management
- Conflict detection between droid responsibilities
- Multi-framework support (React, Node.js, TypeScript, etc.)
- Script wrapping capabilities
- Project brief management system
- Comprehensive documentation suite

### Features
- **Smart Project Analysis**: Scans PRD/README, source code, and scripts
- **Specialized Droid Generation**: Creates role-specific AI assistants
- **Team Orchestration**: Global orchestrator for multi-droid workflows
- **Performance Optimization**: Cached scanning and parallel processing
- **Conflict Resolution**: Automatic detection and resolution of overlapping responsibilities
- **Interactive CLI**: User-friendly command-line interface with progress indicators
- **Comprehensive Documentation**: User guides, tutorials, and troubleshooting

### Core Commands
- `droidforge init` - Initialize project and install orchestrator
- `droidforge synthesize` - Generate droids from analysis
- `droidforge scan` - Analyze repository structure
- `droidforge add-script` - Wrap scripts as droids
- `droidforge reanalyze` - Update existing droids

### Droid Types Supported
- Development droids (dev, frontend, backend)
- Quality droids (reviewer, qa, security)
- Specialized droids (ui-ux, api, domain-specialist)
- Script droids (script-build, script-test, etc.)

### Framework Support
- React, Vue, Angular (frontend)
- Node.js, Express, Fastify (backend)
- TypeScript, JavaScript, Python
- Testing frameworks (Jest, Vitest, Mocha)
- Build tools (Webpack, Vite, Rollup)

## [Future Plans]

### Upcoming Features
- Visual project configuration interface
- Advanced droid customization options
- Team collaboration features
- Integration with more CI/CD platforms
- Plugin system for custom droid types
- Performance analytics and optimization
- Multi-language support
- Enterprise features and SSO integration

### Long-term Vision
- AI-powered project recommendations
- Automated code refactoring suggestions
- Integration with popular development tools
- Real-time collaboration features
- Advanced analytics and insights

---

## Version History

### Version 0.1.0 (Milestone 1)
-  Core CLI functionality
-  Basic droid generation
-  Repository scanning
-  Form-based interview system
-  Documentation suite
-  Testing framework
-  Performance optimizations
-  Conflict resolution system

### Version 0.2.0 (Planned)
-  Advanced customization options
-  Plugin system
-  Enhanced analytics
-  Team collaboration features

### Version 0.3.0 (Planned)
-  Visual configuration interface
-  Advanced AI features
-  Enterprise capabilities
-  Multi-language support

---

## Support

- **Documentation**: [User Guide](./docs/USER_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/factory/droidforge/issues)
- **Community**: [Discord](https://discord.gg/factory)
- **Support**: [Email](mailto:support@factory.ai)

---

*For detailed migration guides and breaking changes, see the [Migration Guide](./docs/MIGRATION.md).*