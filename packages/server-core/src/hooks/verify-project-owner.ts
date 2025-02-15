import { BadRequest, Forbidden } from '@feathersjs/errors'
import { HookContext } from '@feathersjs/feathers'

import { Application } from '../../declarations'
import { UserDataType } from '../user/user/user.class'
import { NotFoundException, UnauthenticatedException, UnauthorizedException } from '../util/exceptions/exception'

export default () => {
  return async (context: HookContext<Application>) => {
    if (context.params.isInternal) return context
    const loggedInUser = context.params.user as UserDataType
    if (!loggedInUser) throw new UnauthenticatedException('No logged in user')
    if (loggedInUser.userRole === 'admin') return context
    const app = context.app
    const projectId =
      context.service === 'project'
        ? context.id
        : context.id && typeof context.id === 'string'
        ? (
            await app.service('project-permission').Model.findOne({
              where: {
                id: context.id
              }
            })
          ).projectId
        : context.data.id || context.data.projectId
    const project = await app.service('project').Model.findOne({
      where: {
        id: projectId
      }
    })
    if (!project) throw new BadRequest('Invalid project ID')
    const projectPermission = await app.service('project-permission').Model.findOne({
      where: {
        userId: loggedInUser.id,
        projectId: projectId
      }
    })

    if (!projectPermission || projectPermission.type !== 'owner')
      throw new Forbidden('You are not an owner of this project')

    return context
  }
}
