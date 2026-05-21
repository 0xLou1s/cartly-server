import { UnprocessableEntityException } from '@nestjs/common'
import { PermissionMessage } from 'src/shared/constants/messages/permission.message'

export const PermissionAlreadyExistsException = new UnprocessableEntityException([
  {
    message: PermissionMessage.Error.PermissionAlreadyExists,
    path: 'path',
  },
  {
    message: PermissionMessage.Error.PermissionAlreadyExists,
    path: 'method',
  },
])
