---
template_version: 1.0
doc_type: hld
language: en
---
# High-Level Design: {{project.name}}

<!-- template_version: 1.0 -->
<!-- generated_at: {{doc.generated_at}} -->

> **Document Type:** High-Level Design (HLD)
> **Project:** {{project.name}} (`{{project.slug}}`)
> **Language:** {{doc.lang}}
> **Generated:** {{doc.generated_at}}

---

## 1. System Overview

{{spec.summary}}

### 1.1 Purpose and Scope

This document describes the high-level architecture of **{{project.name}}**.
It targets customer architects and project leads who need to understand the
system boundary, major components, and key design decisions without diving
into implementation specifics.

### 1.2 Audience

| Role | Sections of Interest |
|------|---------------------|
| Customer Architect | §2, §3, §4, §6 |
| Project Manager | §1, §5, §7 |
| Operations Lead | §4, §5 |
| Security Reviewer | §5, §7 |

---

## 2. Overall System Architecture

{{architecture.overview}}

### 2.1 Context Diagram

> _Place context diagram (C4 Level 1 or equivalent) here._
> _Shows the system boundary and external actors / systems._

### 2.2 Key Architectural Decisions

> _List top 3–5 architectural decisions and their rationale._
> _Source: ARCHITECTURE.md key decision log._

---

## 3. Subsystem Decomposition

{{architecture.modules}}

### 3.1 Component Overview

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| _derived from ARCHITECTURE.md_ | | |

### 3.2 Component Interaction

> _Describe how the main components communicate (sync / async, protocols)._
> _Source: ARCHITECTURE.md §3 Module Design._

---

## 4. External Integrations

> _List external systems, third-party APIs, and data sources this system depends on._

| System | Direction | Protocol | Notes |
|--------|-----------|----------|-------|
| _derived from SPEC.md and ARCHITECTURE.md_ | | | |

---

## 5. Non-Functional Requirements

> _Summarize NFRs drawn from SPEC.md and DISCOVERY_RESULT.md (if available)._

| Category | Requirement | Target Value |
|----------|-------------|--------------|
| Performance | | |
| Availability | | |
| Scalability | | |
| Security | | |
| Maintainability | | |

---

## 6. Technology Stack

{{architecture.tech_stack}}

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| _derived from ARCHITECTURE.md Tech Stack section_ | | | |

---

## 7. Constraints and Assumptions

### 7.1 Constraints

> _List binding constraints: regulatory, budget, existing infrastructure, etc._

### 7.2 Assumptions

> _List assumptions that, if invalidated, would require redesign._

### 7.3 Out of Scope

> _Explicitly state what this system does NOT do._

---

## Appendix A: Use Case Summary

{{spec.use_cases}}

---

## Appendix B: Related Documents

| Document | Location | Description |
|----------|----------|-------------|
| LLD | `docs/deliverables/{{project.slug}}/lld.{{doc.lang}}.md` | Low-Level Design |
| API Reference | `docs/deliverables/{{project.slug}}/api-reference.{{doc.lang}}.md` | API Reference |
| Ops Manual | `docs/deliverables/{{project.slug}}/ops-manual.{{doc.lang}}.md` | Operations Manual |
| SPEC.md | `SPEC.md` | Source specification |
| ARCHITECTURE.md | `ARCHITECTURE.md` | Source architecture document |
