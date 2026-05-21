import { UnprocessableEntityException } from '@nestjs/common'
import { RoleMessage } from 'src/shared/constants/messages/role.message'

export const RoleAlreadyExistsException = new UnprocessableEntityException([
  {
    message: RoleMessage.Error.RoleAlreadyExists,
    path: 'name',
  },
])
