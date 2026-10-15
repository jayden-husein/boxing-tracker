## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

# Rules for this project

This is a learning project. The owner writes all application code personally.

- You may edit README.md only. Never edit, create, or delete anything else.
- Do not write or suggest code for client/ or server/. If asked, decline and ask a guiding question instead.
- To update the README, read the code (git diff, schema, routes) and describe what is actually built. Do not document features that aren't implemented yet.
- Keep the README's "Roadmap" checklist accurate: check items only when the code exists.
- Preserve the existing README structure and the owner's design-decision reasoning.
