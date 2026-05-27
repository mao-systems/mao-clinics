Generate realistic Peruvian seed data for: $ARGUMENTS

Rules for Peruvian data:
- Names: use common Peruvian first names and last names (García, Quispe, Mamani, Torres, etc.)
- DNI: exactly 8 digits, random but valid format
- Phone: 9 digits starting with 9 (Peruvian mobile format)
- Addresses: use real Lima district names (Miraflores, San Borja, Surco, La Molina, etc.)
- Email: firstname.lastname@gmail.com format
- Dates: use realistic dates (not future for birthdates, mix of past/future for appointments)
- Medical data: use realistic Spanish medical terms
- ICD-10 codes: use common codes (J06.9 URI, K21.0 GERD, M54.5 Low back pain, etc.)

Output format: TypeScript code for prisma/seed.ts
Include the prisma.{model}.createMany() call with all records.
Always use the demo tenant_id: "00000000-0000-0000-0000-000000000001"