Generate a complete CRUD module for: $ARGUMENTS

Follow EXACTLY the "What to do when asked to create a new module" section in CLAUDE.md.

Additional requirements:
- Backend service must have these methods:
    findAll(tenantId, filters, pagination)
    findById(tenantId, id)
    create(tenantId, data)
    update(tenantId, id, data)
    softDelete(tenantId, id)
- All service methods receive tenantId as first argument
- Zod schema must validate all fields before any DB call
- React Query hooks: useList, useById, useCreate, useUpdate, useDelete
- Table component uses @tanstack/react-table v8 with pagination
- Form uses react-hook-form + zodResolver
- All text in the UI in Spanish (this is a product for Peruvian clinics)
- API responses follow the success/error format in CLAUDE.md

Do NOT skip any of the 7 steps. Generate all files completely.