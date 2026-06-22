import { Injectable } from '@nestjs/common'
import { ProhibitedActionOnBaseRoleException, RoleAlreadyExistsException } from 'src/routes/role/role.error'
import { CreateRoleBodyType, GetRolesQueryType, UpdateRoleBodyType } from 'src/routes/role/role.model'
import { RoleRepo } from 'src/routes/role/role.repo'
import { RoleMessage } from 'src/shared/constants/messages/role.message'
import { BaseRoleNames, RoleName } from 'src/shared/constants/role.constant'
import { NotFoundRecordException } from 'src/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'

@Injectable()
export class RoleService {
  constructor(private roleRepo: RoleRepo) {}

  list(pagination: GetRolesQueryType) {
    return this.roleRepo.list(pagination)
  }

  async findById(id: number) {
    return this.getRoleOrThrow(id)
  }

  private async getRoleOrThrow(id: number) {
    const role = await this.roleRepo.findById(id)
    if (!role) {
      throw NotFoundRecordException
    }
    return role
  }

  async create({ data, createdById }: { data: CreateRoleBodyType; createdById: number }) {
    try {
      return await this.roleRepo.create({
        createdById,
        data,
      })
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw RoleAlreadyExistsException
      }
      throw error
    }
  }

  async update({ id, data, updatedById }: { id: number; data: UpdateRoleBodyType; updatedById: number }) {
    try {
      const role = await this.getRoleOrThrow(id)
      if (role.name === RoleName.ADMIN) {
        throw ProhibitedActionOnBaseRoleException
      }
      return await this.roleRepo.update({
        id,
        updatedById,
        data,
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw RoleAlreadyExistsException
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      const role = await this.getRoleOrThrow(id)
      if (BaseRoleNames.includes(role.name)) {
        throw ProhibitedActionOnBaseRoleException
      }
      // Soft delete by default — keeps history. Pass `true` from a maintenance path for a hard delete.
      await this.roleRepo.delete({ id, deletedById })
      return {
        message: RoleMessage.Success.Deleted,
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }
}
