# Coding standards

Formatting is Prettier's job and is not discussed. These are the rules that
affect whether the next person can read your code.

## Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Files | kebab-case, with a role suffix | `items.service.ts` |
| React components | PascalCase, one per file | `KpiCard.tsx` |
| Types and interfaces | PascalCase, no `I` prefix | `ItemDto` |
| Variables and functions | camelCase | `deriveHealth` |
| Constants | SCREAMING_SNAKE_CASE | `ROLE_RANK` |
| Database tables | snake_case plural | `meeting_agenda_items` |
| Booleans | ask a question | `isPortfolio`, `hasOverdueItems` |

## TypeScript

- `strict` is on and stays on. `any` is a lint error; use `unknown` and narrow.
- Return types are explicit on every exported function.
- Prefer `type` for unions, `interface` for object shapes that may be extended.
- Never assert with `as` to silence a compiler complaint. Fix the type.

## Functions

- One job each. If you need "and" to describe it, split it.
- Guard clauses over nested conditionals — fail fast, return early.
- Four parameters is the ceiling. Past that, take an object.

## Comments

Comment the **why**, never the what. `// increment counter` is noise;
`// Always verify a password even when the user is missing, so response timing
does not leak account existence` is the reason the code looks odd.

Every module, middleware, and non-obvious helper carries a short doc comment
explaining its contract. That is what makes this codebase readable without
reading all of it.

## Errors

Throw `AppError` and nothing else on purpose. Anything that reaches the error
handler as a plain `Error` is treated as a bug and returned as a generic 500.

User-facing messages say what happened and what to do. No "Error:" prefix, no
apology, no exception text. `'Say what is blocking this before you set it to
blocked'` — not `'Invalid state transition'`.

## Testing

- Unit tests for pure logic: derivation, mapping, role ranking.
- Integration tests for routes, hitting the app object with supertest.
- Test names read as sentences: `it('rejects a role below the minimum')`.
- Cover the happy path and the two most likely failures. Chasing 100% coverage
  produces tests that assert the implementation instead of the behaviour.

## React

- Components are functions. No classes.
- Server state belongs to TanStack Query. `useState` is for UI state only.
- No business logic in a component. It goes in a hook or in the API layer.
- Every interactive element is reachable by keyboard and has a visible focus
  ring. Forms use real `<label>` elements, not placeholder text.
- Colours and spacing come from `tokens.css`. No literal hex in a component.
