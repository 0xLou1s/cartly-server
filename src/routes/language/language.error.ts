import { UnprocessableEntityException } from '@nestjs/common'
import { LanguageMessage } from 'src/shared/constants/messages/language.message'

export const LanguageAlreadyExistsException = new UnprocessableEntityException([
  {
    message: LanguageMessage.Error.LanguageAlreadyExists,
    path: 'id',
  },
])
