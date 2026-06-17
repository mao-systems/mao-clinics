// Ambient declaration — no imports so this file stays a .d.ts (not a module).
// Express reads augmentations to its global namespace, not a module namespace.
declare namespace Express {
  interface Request {
    user: {
      id: string
      tenantId: string
      role: string
    }
    tenantId: string
    platformAdmin: {
      id: string
      email: string
    }
  }
}
