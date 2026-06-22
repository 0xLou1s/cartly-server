import { UserStatus } from 'src/shared/constants/auth.constant'
import { z } from 'zod'
import { PermissionSchema } from './shared-permission.model'
import { RoleSchema } from './shared-role.model'

export const UserSchema = z.object({
  id: z.number(),
  email: z.email(),
  name: z.string().min(1).max(100),
  password: z.string().min(6).max(100),
  phoneNumber: z.string().min(9).max(15),
  avatar: z.string().nullable(),
  totpSecret: z.string().nullable(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BLOCKED]),
  roleId: z.number().positive(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const UserResSchema = UserSchema.omit({
  password: true,
  totpSecret: true,
  createdById: true,
  updatedById: true,
  deletedAt: true,
})

/**
 * Used for the response of GET('profile') and GET('users/:userId')
 */
export const GetUserProfileResSchema = UserSchema.omit({
  password: true,
  totpSecret: true,
}).extend({
  role: RoleSchema.pick({
    id: true,
    name: true,
  }).extend({
    permissions: z.array(
      PermissionSchema.pick({
        id: true,
        name: true,
        module: true,
        path: true,
        method: true,
      }),
    ),
  }),
})

/**
 * Used for the response of PUT('profile') and PUT('users/:userId')
 */
export const UpdateProfileResSchema = UserSchema.omit({
  password: true,
  totpSecret: true,
})

export type UserType = z.infer<typeof UserSchema>
export type UserResType = z.infer<typeof UserResSchema>
export type GetUserProfileResType = z.infer<typeof GetUserProfileResSchema>
export type UpdateProfileResType = z.infer<typeof UpdateProfileResSchema>
