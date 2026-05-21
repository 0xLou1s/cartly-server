import { NotFoundException } from '@nestjs/common'
import { CommonMessage } from 'src/shared/constants/messages/common.message'

export const NotFoundRecordException = new NotFoundException(CommonMessage.Error.NotFound)
