---
template_version: 1.0
doc_type: lld
language: en
---
# Low-Level Design: {{project.name}}

<!-- template_version: 1.0 -->
<!-- generated_at: {{doc.generated_at}} -->

> **Document Type:** Low-Level Design (LLD)
> **Project:** {{project.name}} (`{{project.slug}}`)
> **Language:** {{doc.lang}}
> **Generated:** {{doc.generated_at}}

---

## 1. Module Structure

{{architecture.modules}}

### 1.1 Module Overview

| Module | Package / Directory | Responsibility | Key Interfaces |
|--------|---------------------|----------------|---------------|
| _derived from ARCHITECTURE.md §3 Module Design_ | | | |

### 1.2 Dependency Graph

> _Describe inter-module dependencies (use a textual representation or reference a diagram)._
> _Source: ARCHITECTURE.md module dependency section._

### 1.3 Layer Architecture

{{architecture.overview}}

| Layer | Modules | Description |
|-------|---------|-------------|
| Presentation | | |
| Application | | |
| Domain | | |
| Infrastructure | | |

---

## 2. Class and Function Specifications

> _For each major module, list the primary classes / functions, their signatures,
> and responsibilities. Do not include full implementation logic._

### 2.1 Module: _[Module Name]_

| Symbol | Kind | Signature | Responsibility |
|--------|------|-----------|----------------|
| _derived from src/** Glob scan_ | class / func | | |

> _Repeat section 2.x for each major module identified in §1.1._

---

## 3. Data Structures

> _Describe the primary data models, their fields, types, and constraints._
> _Source: ARCHITECTURE.md `## 4. Database / Data Model` or equivalent._

### 3.1 Core Entities

| Entity | Field | Type | Constraints | Description |
|--------|-------|------|-------------|-------------|
| _derived from ARCHITECTURE.md data model_ | | | | |

### 3.2 Data Flow

> _Describe how data flows between modules for the primary use cases._
> _Reference SPEC.md use cases for context._

---

## 4. API Signatures

> _List the public API signatures this module exposes (HTTP endpoints, gRPC, SDK methods, etc.)._
> _This section covers internal / module-level APIs; see api-reference for customer-facing details._

### 4.1 Internal API Contracts

| Endpoint / Method | Parameters | Return Type | Status Codes | Notes |
|-------------------|-----------|-------------|--------------|-------|
| _derived from ARCHITECTURE.md §5 API Design and src/** scan_ | | | | |

---

## 5. Algorithms

> _Document non-trivial algorithms used in the system:_
> _business logic, calculation engines, data transformation pipelines, etc._

### 5.1 Key Algorithms

| Algorithm | Module | Complexity | Description |
|-----------|--------|-----------|-------------|
| _derived from ARCHITECTURE.md and src/** scan_ | | | |

---

## 6. Error Handling

> _Describe the error handling strategy across modules._

### 6.1 Error Classification

| Error Class | HTTP Status / Code | Handling Strategy | User-Visible? |
|-------------|-------------------|------------------|---------------|
| Validation Error | 400 | | |
| Authentication Error | 401 / 403 | | |
| Not Found | 404 | | |
| Server Error | 500 | | |

### 6.2 Logging and Observability

> _Describe what is logged at each log level and any tracing / metrics instrumentation._
> _Source: ARCHITECTURE.md observability section or OBSERVABILITY.md._

---

## Appendix A: Technology Stack Details

{{architecture.tech_stack}}

---

## Appendix B: Related Documents

| Document | Location | Description |
|----------|----------|-------------|
| HLD | `docs/deliverables/{{project.slug}}/hld.{{doc.lang}}.md` | High-Level Design |
| API Reference | `docs/deliverables/{{project.slug}}/api-reference.{{doc.lang}}.md` | External API Reference |
| ARCHITECTURE.md | `ARCHITECTURE.md` | Source architecture document |
