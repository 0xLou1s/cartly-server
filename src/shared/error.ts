import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { CommonMessage } from 'src/shared/constants/messages/common.message'

export const NotFoundRecordException = new NotFoundException(CommonMessage.Error.NotFound)

export const InvalidPasswordException = new UnprocessableEntityException([
  {
    message: 'Error.InvalidPassword',
    path: 'password',
  },
])
