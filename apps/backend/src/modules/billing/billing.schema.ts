import { z } from 'zod'

export const InvoiceItemInputSchema = z.object({
  description: z.string().min(1).max(200),
  quantity:    z.number().int().min(1).max(99).default(1),
  unit_price:  z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal'),
})

export const CreateInvoiceSchema = z
  .object({
    patient_id:       z.string().uuid(),
    consultation_id:  z.string().uuid().optional().nullable(),
    type:             z.enum(['boleta', 'factura']),
    items:            z.array(InvoiceItemInputSchema).min(1),
    // Factura-only fields
    customer_ruc:     z.string().regex(/^\d{11}$/).optional(),
    customer_name:    z.string().max(200).optional(),
    customer_address: z.string().max(300).optional(),
  })
  .refine(
    (data) => {
      // If type is factura, customer_ruc and customer_name are recommended but not enforced at schema
      // level so that the mock provider can still work without SUNAT credentials
      return true
    },
  )

export const BillingQuerySchema = z.object({
  from:       z.string().datetime().optional(),
  to:         z.string().datetime().optional(),
  type:       z.enum(['boleta', 'factura', 'nota_credito']).optional(),
  patient_id: z.string().uuid().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
})

export const CancelInvoiceSchema = z.object({
  reason: z.string().min(1).max(500),
})

export type CreateInvoiceInput  = z.infer<typeof CreateInvoiceSchema>
export type BillingQueryInput   = z.infer<typeof BillingQuerySchema>
export type CancelInvoiceInput  = z.infer<typeof CancelInvoiceSchema>
