Add a new endpoint to an existing module: $ARGUMENTS

Format of $ARGUMENTS: "METHOD /path description"
Example: "GET /appointments/availability returns available slots for a doctor on a date"

Requirements:
- Add route to the existing {module}.routes.ts
- Add method to the existing {module}.service.ts
- Add Zod schema to {module}.schema.ts if new input is needed
- ALWAYS filter by tenantId from req.tenantId
- Follow the success/error response format in CLAUDE.md
- Write the complete implementation, not just a stub
- Show the exact line where to register the new route in the router