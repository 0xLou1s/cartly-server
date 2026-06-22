import { HTTPMethod } from 'src/shared/constants/role.constant'
import { z } from 'zod'

export const PermissionSchema = z.object({
  id: z.number(),
  name: z.string().max(500),
  description: z.string(),
  // `module` is derived from the first path segment (e.g. "/role/..." -> "ROLE").
  // The frontend can group permissions by this field for rendering, e.g.:
  //   const groupPermissionsByModule = (permissions) =>
  //     permissions.reduce((result, permission) => {
  //       const { module } = permission
  //       if (!result[module]) result[module] = []
  //       result[module].push(permission)
  //       return result
  //     }, {})
  module: z.string().max(500),
  path: z.string().max(1000),
  method: z.enum([
    HTTPMethod.GET,
    HTTPMethod.POST,
    HTTPMethod.PUT,
    HTTPMethod.DELETE,
    HTTPMethod.PATCH,
    HTTPMethod.OPTIONS,
    HTTPMethod.HEAD,
  ]),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type PermissionType = z.infer<typeof PermissionSchema>
