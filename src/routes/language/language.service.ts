import { Injectable } from '@nestjs/common'
import { LanguageAlreadyExistsException } from 'src/routes/language/language.error'
import { CreateLanguageBodyType, UpdateLanguageBodyType } from 'src/routes/language/language.model'
import { LanguageRepo } from 'src/routes/language/language.repo'
import { LanguageMessage } from 'src/shared/constants/messages/language.message'
import { NotFoundRecordException } from 'src/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'

@Injectable()
export class LanguageService {
  constructor(private languageRepo: LanguageRepo) {}

  async findAll() {
    const data = await this.languageRepo.findAll()
    return {
      data,
      totalItems: data.length,
    }
  }

  async findById(id: string) {
    const language = await this.languageRepo.findById(id)
    if (!language) {
      throw NotFoundRecordException
    }
    return language
  }

  async create({ data, createdById }: { data: CreateLanguageBodyType; createdById: number }) {
    try {
      return await this.languageRepo.create({
        createdById,
        data,
      })
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw LanguageAlreadyExistsException
      }
      throw error
    }
  }

  async update({ id, data, updatedById }: { id: string; data: UpdateLanguageBodyType; updatedById: number }) {
    try {
      const language = await this.languageRepo.update({
        id,
        updatedById,
        data,
      })
      return language
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async delete(id: string) {
    try {
      // Soft delete by default — keeps history and lets translations referencing this
      // language stay queryable. Pass `true` from a maintenance path if you need a hard delete.
      await this.languageRepo.delete(id)
      return {
        message: LanguageMessage.Success.Deleted,
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }
}
