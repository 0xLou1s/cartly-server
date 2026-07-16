import { UnprocessableEntityException } from '@nestjs/common'
import { createZodValidationPipe } from 'nestjs-zod'
import { ValidationMessage } from 'src/shared/constants/messages/validation.message'
import { ZodError } from 'zod'

// Zod's built-in issues carry raw English messages. Map them to i18n keys so the
// client always gets a key, like the custom issues raised via ctx.addIssue.
const BUILT_IN_ISSUE_MESSAGE: Record<string, string> = {
  invalid_type: ValidationMessage.Error.InvalidType,
  invalid_format: ValidationMessage.Error.InvalidFormat,
  invalid_value: ValidationMessage.Error.InvalidValue,
  invalid_union: ValidationMessage.Error.InvalidUnion,
  invalid_key: ValidationMessage.Error.InvalidKey,
  invalid_element: ValidationMessage.Error.InvalidElement,
  too_small: ValidationMessage.Error.TooSmall,
  too_big: ValidationMessage.Error.TooBig,
  not_multiple_of: ValidationMessage.Error.NotMultipleOf,
  unrecognized_keys: ValidationMessage.Error.UnrecognizedKeys,
}

const CustomZodValidationPipe = createZodValidationPipe({
  createValidationException: (error: ZodError) =>
    new UnprocessableEntityException(
      error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join('.'),
        // Custom issues already carry a message key; built-in ones do not.
        message:
          issue.code === 'custom'
            ? issue.message
            : (BUILT_IN_ISSUE_MESSAGE[issue.code] ?? ValidationMessage.Error.Invalid),
      })),
    ),
})

export default CustomZodValidationPipe
