import { Engine } from '@xrengine/engine/src/ecs/classes/Engine'
import { Entity } from '@xrengine/engine/src/ecs/classes/Entity'
import { getComponent } from '@xrengine/engine/src/ecs/functions/ComponentFunctions'
import { PortalComponent } from '@xrengine/engine/src/scene/components/PortalComponent'
import { setRemoteLocationDetail } from '@xrengine/engine/src/scene/functions/createPortal'

import { API } from '../../API'

export const getPortalDetails = () => {
  Engine.instance.currentWorld.portalQuery().map(async (entity: Entity): Promise<void> => {
    const portalComponent = getComponent(entity, PortalComponent)
    try {
      const portalDetails = await API.instance.client.service('portal').get(portalComponent.linkedPortalId)
      if (portalDetails) {
        setRemoteLocationDetail(portalComponent, portalDetails.data.spawnPosition, portalDetails.data.spawnRotation)
        // const envMapBakeDetails = await (
        //   await fetch(`${SERVER_URL}/cubemap/${portalDetails.data.envMapBakeId}`, options)
        // ).json()
        // // console.log('envMapBakeDetails', envMapBakeDetails)
        // if (envMapBakeDetails) {
        //   const textureLoader = new TextureLoader()
        //   const texture = textureLoader.load(envMapBakeDetails.data.options.envMapOrigin)
        //   texture.mapping = EquirectangularRefractionMapping

        //   const portalMaterial = new MeshLambertMaterial({ envMap: texture, side: DoubleSide })

        //   portal.previewMesh.material = portalMaterial

        //   // texture.dispose()
        // }
      }
    } catch (e) {
      console.log(e)
    }
  })
}
