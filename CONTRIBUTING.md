# Contributing to x402 Starknet

Thank you for your interest in contributing to x402 on Starknet! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Prioritize the community's best interests

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Collect relevant information (versions, error messages, steps to reproduce)
3. Test on the latest version

When submitting:
- Use a clear, descriptive title
- Provide detailed steps to reproduce
- Include expected vs actual behavior
- Add screenshots/logs if applicable
- Specify your environment (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please:
- Use a clear, descriptive title
- Explain the current behavior and why it's insufficient
- Describe the proposed enhancement
- Explain the use case and benefits
- Consider backwards compatibility

### Pull Requests

#### Before Submitting

1. **Fork the repository** and create a branch from `main`
2. **Follow the coding style** (see below)
3. **Write tests** for new functionality
4. **Update documentation** as needed
5. **Run linters** and fix any issues
6. **Test thoroughly** on both Sepolia and (if applicable) mainnet

#### PR Guidelines

- **One feature per PR** - Keep PRs focused and manageable
- **Clear description** - Explain what changes were made and why
- **Reference issues** - Link related issues (e.g., "Fixes #123")
- **Update changelog** - Add entry under "Unreleased"
- **Pass CI checks** - Ensure all automated checks pass

#### PR Process

1. Submit your PR with a clear title and description
2. Respond to review feedback promptly
3. Keep your PR updated with `main` branch
4. Once approved, maintainers will merge

## Development Setup

### Prerequisites

```bash
# Node.js 18+
node --version

# Cairo/Starknet tools
scarb --version
starkli --version
```

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/your-username/starknet-x402.git
cd starknet-x402

# Install dependencies
npm install

# Copy environment template
cp env.example .env
# Edit .env with your settings

# Compile TypeScript
npm run compile

# Run tests
npm test
```

### Running Locally

```bash
# Terminal 1: Start facilitator
npm run facilitator

# Terminal 2: Start resource server
npm run server

# Terminal 3: Run client examples
npm run client
```

## Coding Standards

### TypeScript Style

- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Use async/await over callbacks
- Handle errors explicitly

Example:
```typescript
/**
 * Verifies a payment signature
 * @param payload - Payment data to verify
 * @param requirements - Payment requirements
 * @returns Verification result with validity status
 */
async function verifyPayment(
  payload: StarknetExactPayload,
  requirements: PaymentRequirements
): Promise<VerifyResponse> {
  // Implementation
}
```

### Cairo Style

- Follow Starknet best practices
- Add comments for complex logic
- Use descriptive variable names
- Include natspec documentation
- Consider gas optimization

### File Organization

```
src/
├── types/          # Type definitions
├── contracts/      # Cairo contracts
├── facilitator/    # Facilitator implementation
├── middleware/     # Express middleware
└── client/         # Client library

examples/           # Example implementations
docs/              # Documentation
scripts/           # Utility scripts
```

## Testing

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- verifier.test.ts

# With coverage
npm test -- --coverage
```

### Writing Tests

- Write tests for all new functionality
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies
- Aim for >80% code coverage

Example:
```typescript
describe('PaymentVerifier', () => {
  it('should verify valid payment signature', async () => {
    const verifier = new StarknetVerifier(config);
    const result = await verifier.verifyExactPayment(
      validPayload,
      requirements
    );
    expect(result.isValid).toBe(true);
  });

  it('should reject expired payment', async () => {
    const expiredPayload = { ...validPayload, deadline: 0 };
    const result = await verifier.verifyExactPayment(
      expiredPayload,
      requirements
    );
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toContain('expired');
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments to all public APIs
- Explain complex algorithms
- Include usage examples
- Document error conditions

### User Documentation

When adding features, update:
- README.md
- GETTING_STARTED.md
- API_REFERENCE.md
- Examples in `examples/`

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build process, tooling changes

Examples:
```
feat(verifier): add support for multi-sig verification

Add support for verifying payments signed by multiple
signers for enhanced security.

Closes #123
```

```
fix(settler): handle RPC timeout errors

Previously, RPC timeouts would crash the settler. Now
we retry with exponential backoff.
```

## Acceptance Criteria

For a PR to be merged, it must:

1. **Be on-topic** - Align with project goals
2. **Follow standards** - Match coding style and conventions
3. **Include tests** - Have adequate test coverage
4. **Pass CI** - All automated checks must pass
5. **Have documentation** - Include relevant docs updates
6. **Be reviewed** - Approved by at least one maintainer
7. **Be secure** - No security vulnerabilities
8. **Be performant** - Not significantly degrade performance

### Payment Schemes

When adding new payment schemes:

1. Must not allow facilitator to move funds arbitrarily
2. Must include signature verification
3. Must prevent replay attacks
4. Must handle edge cases (expiry, insufficient balance, etc.)
5. Must be well-documented with examples
6. Must include comprehensive tests

## Project Structure

### Adding a New Feature

1. Create an issue describing the feature
2. Discuss implementation approach
3. Create feature branch: `feature/description`
4. Implement with tests
5. Update documentation
6. Submit PR

### Modifying Core Protocol

Changes to core protocol require:
- Discussion with maintainers
- Backwards compatibility plan
- Migration guide if breaking
- Extensive testing

## Getting Help

- **GitHub Issues** - For bugs and features
- **Discussions** - For questions and ideas
- **Discord** - For real-time help
- **Documentation** - Check docs first

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Recognized in project README

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to x402 on Starknet! 🚀


