export const RoleName = {
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT',
  SELLER: 'SELLER',
}

// Built-in roles that users are not allowed to mutate (update/delete).
export const BaseRoleNames: string[] = [RoleName.ADMIN, RoleName.CLIENT, RoleName.SELLER]

export const HTTPMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD',
} as const
