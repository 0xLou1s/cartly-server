import { createZodDto } from 'nestjs-zod'
import { GetUserProfileResSchema, UpdateProfileResSchema } from '../models/shared-user.model'

/**
 * Used for the response of GET('profile') and GET('users/:userId')
 */
export class GetUserProfileResDTO extends createZodDto(GetUserProfileResSchema) {}

/**
 * Used for the response of PUT('profile') and PUT('users/:userId')
 */
export class UpdateProfileResDTO extends createZodDto(UpdateProfileResSchema) {}
