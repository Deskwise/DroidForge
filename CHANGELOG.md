# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2025-01-21

### 🔥 **MAJOR REWRITE - AI-POWERED INTERVIEWS**
- **COMPLETELY REPLACED** keyword-matching interview system with AI-powered analysis
- **BMAD ANALYST APPROACH**: Now uses AI to understand user intent and generate intelligent follow-up questions
- **CONVERSATIONAL INTELLIGENCE**: AI analyzes full conversation context instead of simple keyword matching
- **DYNAMIC QUESTION GENERATION**: Follow-up questions adapt based on user responses and conversation flow
- **ELIMINATED ALL KEYWORD MATCHING**: No more hardcoded patterns or rigid keyword detection

### Fixed
- **Completely removed** all keyword-based domain detection
- **Replaced** static question patterns with AI-generated responses
- **Fixed** conversation flow that was basically a digital form
- **Eliminated** false positive domain assignments and confusing question sequences

### New Architecture
- `generateFollowUpQuestion()` now uses AI to analyze conversation and generate intelligent responses
- `analyzeConversationWithAI()` uses AI to extract project insights from conversation
- `generateAIResponse()` framework for integrating with AI models (Claude/OpenAI/etc.)
- Async conversation loop that properly handles AI response generation

### Example Transformation
**Before (Keyword Matching):**
User: "software" → System: "That's fantastic! Education is such an important field..." ❌

**After (AI-Powered):**
User: "We're a bakery struggling with manual orders" → AI: "Tell me about the problem you're trying to solve." ✅

### Technical Changes
- Removed ALL keyword-based functions and pattern matching
- Implemented async AI analysis functions
- Created conversation context awareness
- Added framework for AI model integration (TODO: Connect to actual AI APIs)

## [0.3.5] - 2025-01-21

### Fixed
- Fixed conversation system incorrectly assuming domains from single words
- Improved tech stack detection for "software", "app", "application" responses
- Enhanced domain detection to require contextual keywords (not just word matching)
- Fixed education domain triggering from non-educational contexts
- Better conversation flow that distinguishes between tech type and industry domain

### Improved
- More intelligent question sequencing: tech type → domain → requirements
- Context-aware domain detection requiring multiple related keywords
- Clearer separation between technology stack and business domain conversations
- Reduced false positive domain assignments

## [0.3.4] - 2025-01-21

### Added
- Comprehensive documentation updates for removeall command usage
- Added detailed examples and use cases for the removeall command
- Updated USER_GUIDE with complete command reference
- Updated TUTORIAL with correct directory structure references

### Changed
- Updated all GitHub repository URLs from factory/droidforge to Deskwise/DroidForge
- Updated all community links and support references
- Updated all documentation to reflect .droidforge directory structure
- Changed branding references from factory to droidforge communities

### Fixed
- Fixed broken repository links in all documentation files
- Updated community support links to point to correct resources
- Synchronized all documentation with recent structural changes

## [0.3.3] - 2025-01-21

### Added
- New `droidforge removeall` command to clean all droids and DroidForge files from repository
- Interactive confirmation prompt for safe removal with `--confirm` flag to bypass
- Intelligent detection of existing DroidForge files before removal
- Complete migration from `.factory` to `.droidforge` directory structure
- Updated all branding to remove "Factory" references throughout the codebase

### Changed
- Migrated all internal references from `.factory/` to `.droidforge/` directories
- Updated CLI descriptions from "Factory droid army" to "specialized AI droid army"
- Updated all documentation files to reflect new directory structure
- Fixed deprecation warnings by using `fs.rm` instead of `fs.rmdir`
- Updated GitHub repository references from factory/droidforge to Deskwise/DroidForge
- Updated support links and community references to point to correct resources

### Fixed
- Removed dependency on Factory CLI branding to avoid trademark conflicts
- Fixed filesystem deprecation warnings for Node.js compatibility
- Updated help text to reference correct `droidforge` commands instead of `factory` commands

### Security
- Safer file removal with proper error handling and user confirmation
- Better validation of file existence before attempting removal

## [0.3.2] - 2025-01-21

### Fixed
- Fixed conversation system that was ending immediately without asking questions
- Added proper first question "What do you want to build?" to start conversations
- Improved domain detection logic for general user responses
- System now properly engages users in dialogue instead of defaulting to random droids

## [0.3.1] - 2025-01-21

### Fixed
- Updated repository URLs from factory/droidforge to Deskwise/DroidForge
- Changed author and homepage links to point to correct Deskwise resources
- Removed "Factory CLI" references from package description and keywords
- Fixed branding inconsistencies in NPM package metadata

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