---
template_version: 1.0
doc_type: handover
language: en
---
# Handover Document: {{project.name}}

<!-- template_version: 1.0 -->
<!-- generated_at: {{doc.generated_at}} -->

> **Document Type:** Handover Package
> **Project:** {{project.name}} (`{{project.slug}}`)
> **Language:** {{doc.lang}}
> **Generated:** {{doc.generated_at}}

> _This document packages the key information needed for the successor
> maintenance team to take over this project._

---

## 1. Project Overview

{{spec.summary}}

### 1.1 Project Background

{{architecture.overview}}

### 1.2 Project Status at Handover

| Aspect | Status | Notes |
|--------|--------|-------|
| Development | Complete | |
| Testing | | |
| Deployment | | |
| Documentation | | |

### 1.3 Key Contacts

| Role | Name | Contact | Availability |
|------|------|---------|-------------|
| Project Owner | | | |
| Lead Developer | | | |
| Operations Lead | | | |
| Customer Contact | | | |

---

## 2. Design Decision History

> _Key architectural and design decisions made during the project._
> _Source: docs/design-notes/*.md (archived/ excluded per MVP scope)._

### 2.1 Major Design Decisions

| Decision | Date | Rationale | Alternatives Considered |
|----------|------|-----------|------------------------|
| _derived from docs/design-notes/*.md_ | | | |

### 2.2 Known Technical Debt

> _Items that were deferred or deprioritized during development._

| Item | Impact | Priority | Notes |
|------|--------|---------|-------|
| | | | |

---

## 3. Known Issues and Open Tasks

### 3.1 Known Issues

> _Active issues at time of handover._

| Issue ID | Title | Severity | Status | Notes |
|----------|-------|----------|--------|-------|
| | | | | |

### 3.2 Open Tasks / Backlog Items

> _Incomplete features, improvements, or investigations at time of handover._

| Task | Priority | Effort Estimate | Notes |
|------|----------|-----------------|-------|
| | | | |

### 3.3 Deferred Items

> _Items explicitly deferred to a future phase or maintenance window._

---

## 4. Test and Security Audit Summary

{{tests.summary}}

{{security.summary}}

### 4.1 Test Coverage Summary

| Test Type | Coverage | Last Run | Status |
|-----------|----------|---------|--------|
| Unit Tests | | | |
| Integration Tests | | | |
| E2E Tests | | | |

### 4.2 Security Audit Summary

> _Source: SECURITY_AUDIT.md (if present)_

| Finding | Severity | Status | Remediation |
|---------|---------|--------|------------|
| _derived from SECURITY_AUDIT.md_ | | | |

### 4.3 Outstanding Security Items

> _Any security items not yet resolved at handover._

---

## 5. Operations Handover Notes

### 5.1 Deployment Procedures

> _Key deployment steps for the successor team._
> _Refer to the full Ops Manual for detailed procedures._

### 5.2 Access and Credentials

> _List system access points, secrets management approach, and who holds what credentials._
> **Do NOT include actual credentials in this document.**

| System | Access Method | Who Holds Access | Notes |
|--------|--------------|-----------------|-------|
| Production Environment | | | |
| Database | | | |
| External APIs | | | |
| CI/CD | | | |

### 5.3 Monitoring and Alerting

> _Key dashboards and alert channels the successor team should monitor._
> _Refer to the Ops Manual for detailed runbooks._

### 5.4 First 30-Day Checklist

> _Recommended actions for the incoming team in the first 30 days._

- [ ] Review architecture documentation (HLD, LLD)
- [ ] Set up access to all required systems
- [ ] Shadow the first deployment cycle
- [ ] Review open issues and backlog
- [ ] Complete ops manual walkthrough with outgoing team
- [ ] Review security audit findings

---

## 6. Related Document Index

> _Index of all deliverables and artifacts generated in this project._

### 6.1 Deliverables (This Run)

| Document | Path | Status |
|----------|------|--------|
| HLD | `docs/deliverables/{{project.slug}}/hld.{{doc.lang}}.md` | |
| LLD | `docs/deliverables/{{project.slug}}/lld.{{doc.lang}}.md` | |
| API Reference | `docs/deliverables/{{project.slug}}/api-reference.{{doc.lang}}.md` | |
| Ops Manual | `docs/deliverables/{{project.slug}}/ops-manual.{{doc.lang}}.md` | |
| User Manual | `docs/deliverables/{{project.slug}}/user-manual.{{doc.lang}}.md` | |

> _Note: If any of the above were not generated in this run, a note appears here._

### 6.2 Core Aphelion Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| SPEC.md | `docs/SPEC.md` (or `SPEC.md` if legacy root; resolved per `document-locations.md`) | System specification |
| ARCHITECTURE.md | `docs/ARCHITECTURE.md` (or `ARCHITECTURE.md` if legacy root; resolved per `document-locations.md`) | Architecture document |
| SECURITY_AUDIT.md | `docs/SECURITY_AUDIT.md` (or `SECURITY_AUDIT.md` if legacy root; resolved per `document-locations.md`) | Security audit report |
| TEST_PLAN.md | `docs/TEST_PLAN.md` (or `TEST_PLAN.md` if legacy root; resolved per `document-locations.md`) | Test plan |
| OPS_PLAN.md | `docs/OPS_PLAN.md` (or `OPS_PLAN.md` if legacy root; resolved per `document-locations.md`) | Operations plan |

### 6.3 Design Notes

> _Source: docs/design-notes/*.md (direct files only, archived/ excluded)_

| Design Note | Topic |
|-------------|-------|
| _derived from docs/design-notes/*.md Glob scan_ | |
