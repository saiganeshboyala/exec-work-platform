# 1. Record architecture decisions

Date: 2026-08-22
Status: Accepted

## Context

Decisions that shape a codebase get made in chat threads and then forgotten. Six
months later nobody remembers why the dashboard has its own repository, and the
reasoning gets re-litigated or, worse, silently undone.

## Decision

Every decision that is expensive to reverse gets a short record in `docs/adr/`,
numbered sequentially. A record states the context, the decision, and the
consequences — including the ones we do not like.

Records are immutable. A decision that changes gets a new record that supersedes
the old one; the old one stays, marked superseded.

## Consequences

Slightly more ceremony on significant changes. In exchange, a new developer can
read why the code looks the way it does instead of guessing.
