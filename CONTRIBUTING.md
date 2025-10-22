# Contributing to DroidForge

Thank you for your interest in contributing to DroidForge! This guide will help you get started with contributing to the project.

##  Quick Start for Contributors

### Prerequisites
- Node.js 16+ (18+ recommended)
- Git
- Basic knowledge of TypeScript and Node.js
- Familiarity with CLI tools

### Development Setup

1. **Fork and Clone**
```bash
git clone https://github.com/YOUR_USERNAME/droidforge.git
cd droidforge
```

2. **Install Dependencies**
```bash
npm install
```

3. **Run Development Mode**
```bash
npm run dev
```

4. **Run Tests**
```bash
npm test
```

5. **Build Project**
```bash
npm run build
```

##  Project Structure

```
droidforge/
├── src/                    # TypeScript source code
│   ├── cli.ts             # Main CLI entry point
│   ├── detectors/         # Repository scanning modules
│   ├── orchestrator/      # Droid generation logic
│   ├── utils/             # Utility functions
│   ├── writers/           # File writing modules
│   └── types.ts           # TypeScript type definitions
├── tests/                 # Test files
├── docs/                  # Documentation
├── bin/                   # CLI binary files
├── dist/                  # Compiled JavaScript (generated)
└── .droidforge/              # Generated droid files (example)
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests
- Use Node.js built-in test runner
- Place tests in `tests/` directory with `.test.js` extension
- Follow naming convention: `module-name.test.js`
- Test both happy paths and edge cases

### Test Structure
```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { yourFunction } from '../src/your-module.js';

describe('Your Module', () => {
  it('should do something', () => {
    const result = yourFunction(input);
    assert.strictEqual(result, expected);
  });

  it('should handle edge cases', () => {
    assert.throws(() => yourFunction(invalidInput));
  });
});
```

## 📝 Code Style

### ESLint and Prettier
This project uses ESLint and Prettier for code formatting:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Code Standards
- Use TypeScript for all new code
- Follow ES Module syntax (`import`/`export`)
- Use single quotes for strings
- Use 2 spaces for indentation
- Add JSDoc comments for public functions
- Use descriptive variable and function names

### Example Code Style
```typescript
/**
 * Validates a project brief structure
 * @param brief - The project brief to validate
 * @returns True if valid, throws error if invalid
 */
export function validateProjectBrief(brief: ProjectBrief): boolean {
  if (!brief.project?.name) {
    throw new Error('Project name is required');
  }

  return true;
}
```

##  Development Workflow

### 1. Create an Issue
- Check existing issues first
- Describe the problem or feature request clearly
- Include steps to reproduce if it's a bug
- Label with appropriate tags (bug, enhancement, etc.)

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make Changes
- Write clear, focused commits
- Follow conventional commit format:
  - `feat: add new feature`
  - `fix: resolve bug description`
  - `docs: update documentation`
  - `test: add tests for feature`
  - `refactor: improve code structure`

### 4. Test Your Changes
```bash
# Run full test suite
npm test

# Check linting
npm run lint

# Build project
npm run build

# Test CLI functionality locally
npm pack
npm install -g droidforge-*.tgz
droidforge --help
```

### 5. Submit Pull Request
- Update documentation if needed
- Include tests for new functionality
- Ensure all tests pass
- Request review from maintainers
- Link to relevant issues

## 🐛 Bug Reports

### Bug Report Template
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Run `droidforge init`
2. Provide input X
3. Observe error Y

## Expected Behavior
What should have happened

## Actual Behavior
What actually happened

## Environment
- OS: [e.g., macOS 13.0]
- Node.js version: [e.g., 18.17.0]
- DroidForge version: [e.g., 0.1.0]

## Additional Context
Any other relevant information
```

## ✨ Feature Requests

### Feature Request Template
```markdown
## Feature Description
Clear description of the feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should this work?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Any other relevant information
```

##  Documentation

### Types of Documentation
- **User Guide**: How to use DroidForge
- **API Documentation**: Technical API reference
- **Tutorials**: Step-by-step guides
- **Troubleshooting**: Common issues and solutions

### Documentation Standards
- Use clear, concise language
- Include code examples
- Test all code examples
- Update documentation with code changes
- Use consistent formatting

### Writing Documentation
- Documentation files in `docs/` directory
- Use Markdown format
- Include table of contents for long documents
- Add cross-references between related topics
- Include examples and use cases

## 🏷 Release Process

### Version Management
- Follow Semantic Versioning (SemVer)
- Update version in `package.json`
- Update CHANGELOG.md
- Create Git tag with version number

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version number updated
- [ ] Git tag created
- [ ] GitHub release created
- [ ] Published to NPM

##  Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

### Getting Help
- Read documentation first
- Search existing issues
- Ask questions in GitHub Discussions
- Join our Discord community

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat and community support
- **Email**: security@factory.ai (security issues only)

##  Development Tools

### Recommended VS Code Extensions
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens
- Thunder Client (for API testing)

### Useful NPM Scripts
```bash
npm run dev          # Development mode
npm run build        # Build for production
npm run test         # Run tests
npm run test:watch   # Tests in watch mode
npm run lint         # Check code style
npm run lint:fix     # Fix linting issues
npm run format       # Format code
npm run clean        # Clean build artifacts
```

##  Contribution Areas

### High Priority Areas
- Bug fixes and stability improvements
- Performance optimizations
- Test coverage improvements
- Documentation enhancements

### Feature Contributions
- New droid types and templates
- Additional framework support
- CLI improvements and new commands
- Integration with other tools

### Community Contributions
- Blog posts and tutorials
- Example projects and templates
- Translations and internationalization
- Community meetups and talks

##  Review Process

### What We Look For
- Code quality and maintainability
- Test coverage and quality
- Documentation completeness
- Alignment with project goals
- Performance considerations

### Review Criteria
- [ ] Code follows project style guidelines
- [ ] Tests are comprehensive and passing
- [ ] Documentation is updated
- [ ] Changes are backward compatible
- [ ] Performance impact is considered

##  Recognition

### Contributors
- All contributors are recognized in our README
- Top contributors get special recognition
- Contributions are highlighted in release notes

### Ways to Contribute
- Code contributions
- Documentation improvements
- Bug reports and feature requests
- Community support and mentoring
- Design and UX feedback

---

Thank you for contributing to DroidForge! Your contributions help make AI-powered development accessible to everyone.

 **Happy coding!**