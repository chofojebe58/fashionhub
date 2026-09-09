import { z } from 'zod';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten() });
    }
    req.validated = result.data;
    next();
  };
}

export const schemas = {
  register: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().optional(),
    lastName: z.string().optional()
  }),
  login: z.object({
    email: z.string().email(),
    password: z.string()
  }),
  cartItem: z.object({
    productId: z.string(),
    variantId: z.number().optional(),
    quantity: z.number().int().min(1).max(99)
  }),
  checkout: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().default('US'),
    paymentMethodId: z.string().optional()
  }),
  product: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    old_price: z.number().optional(),
    image: z.string().optional(),
    description: z.string().optional(),
    features: z.array(z.string()).optional(),
    category: z.string().optional(),
    stock: z.number().optional()
  })
};