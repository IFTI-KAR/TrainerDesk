const { z } = require('zod');

const registerSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().email('Valid email address is required').toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot exceed 128 characters'),
    gymName: z.string().trim().max(100).optional().default(''),
    phone: z.string().trim().max(30).optional().default(''),
  }),
};

const loginSchema = {
  body: z.object({
    email: z.string().trim().email('Valid email address is required').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
};

const changePasswordSchema = {
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z
        .string()
        .min(8, 'New password must be at least 8 characters')
        .max(128, 'New password cannot exceed 128 characters'),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from your current password',
      path: ['newPassword'],
    }),
};

const updateProfileSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    gymName: z.string().trim().max(100).optional(),
    bio: z.string().trim().max(500).optional(),
    preferences: z
      .object({
        weightUnit: z.enum(['kg', 'lb']).optional(),
        theme: z.enum(['light', 'dark', 'system']).optional(),
        defaultSessionDuration: z.coerce.number().int().min(15).max(240).optional(),
        timezone: z.string().trim().min(1).max(60).optional(),
      })
      .optional(),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
};
