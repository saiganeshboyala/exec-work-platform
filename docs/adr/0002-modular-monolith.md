# 2. Start as a modular monolith

Date: 2026-08-22
Status: Accepted

## Context

The domain has clear seams — work, people, comms, meetings, reporting — and it is
tempting to deploy them as separate services from day one. But the team is small,
the traffic is unknown, and the boundaries have not been tested by real usage.
Microservices bought early are paid for in distributed transactions, network
failure modes, and deploy coordination, before any of the scaling benefit arrives.

## Decision

Build one deployable API with hard module boundaries inside it:

- Each module owns its own folder and exposes a public surface through `index.ts`
- An ESLint rule makes reaching into another module's internals a build failure
- Modules talk through service functions, which are the same calls that would
  become network calls later
- Integrations sit behind interfaces, so the external world is already decoupled

## Consequences

A single process to run, one deploy, transactions that are actually transactions,
and a codebase a new developer can read in a day.

The cost is that the boundaries are enforced by lint rather than by the network,
so they can be eroded by anyone willing to disable a rule. That is a code review
responsibility.

When one module genuinely needs its own scaling profile — the dashboard read path
is the likely first — it lifts out with its repository and service intact,
because nothing outside it ever touched its internals.
