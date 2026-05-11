# File Operation Principles

- Always `Read` the contents of an existing file before overwriting it
- Do not delete files (unless the user explicitly instructs it)
- Do not create directories not listed in design documents (SPEC.md / ARCHITECTURE.md)
- For Aphelion-generated planning / design / handoff artifacts (SPEC.md, ARCHITECTURE.md,
  UI_SPEC.md, etc.), resolve paths per `document-locations.md` rather than hard-coding
  a location. New files default to `docs/<NAME>.md`; existing files are found via
  `Glob("{docs/<NAME>.md,<NAME>.md}")` (single call — never two sequential Reads).
