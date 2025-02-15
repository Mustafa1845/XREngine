import { createState } from '@speigg/hookstate'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three'

import {
  AVATAR_FILE_ALLOWED_EXTENSIONS,
  MAX_AVATAR_FILE_SIZE,
  MIN_AVATAR_FILE_SIZE,
  REGEX_VALID_URL,
  THUMBNAIL_FILE_ALLOWED_EXTENSIONS,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WIDTH
} from '@xrengine/common/src/constants/AvatarConstants'
import { AssetLoader } from '@xrengine/engine/src/assets/classes/AssetLoader'
import { loadAvatarForPreview } from '@xrengine/engine/src/avatar/functions/avatarFunctions'
import { Engine } from '@xrengine/engine/src/ecs/classes/Engine'
import { Entity } from '@xrengine/engine/src/ecs/classes/Entity'
import { createEntity, removeEntity } from '@xrengine/engine/src/ecs/functions/EntityFunctions'
import { useWorld } from '@xrengine/engine/src/ecs/functions/SystemHooks'
import { getOrbitControls } from '@xrengine/engine/src/input/functions/loadOrbitControl'
import { createXRUI } from '@xrengine/engine/src/xrui/functions/createXRUI'
import { accessWidgetAppState, WidgetAppActions } from '@xrengine/engine/src/xrui/WidgetAppService'
import { dispatchAction } from '@xrengine/hyperflux'

import { AccountCircle, ArrowBack, CloudUpload, SystemUpdateAlt } from '@mui/icons-material'

import {
  addAnimationLogic,
  initialize3D,
  onWindowResize,
  validate
} from '../../../user/components/UserMenu/menus/helperFunctions'
import { AuthService } from '../../../user/services/AuthService'
import styleString from './index.scss'

export function createUploadAvatarMenu() {
  return createXRUI(UploadAvatarMenu, createUploadAvatarMenuState())
}

function createUploadAvatarMenuState() {
  return createState({})
}

let camera: PerspectiveCamera
let scene: Scene
let renderer: WebGLRenderer = null!
let entity: Entity = null!

export const UploadAvatarMenu = () => {
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState<any>(null)
  const [avatarName, setAvatarName] = useState('')
  const [error, setError] = useState('')
  const [avatarModel, setAvatarModel] = useState<any>(null)
  const [activeSourceType, setActiveSourceType] = useState(1)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [validAvatarUrl, setValidAvatarUrl] = useState(false)
  const [selectedThumbnailUrl, setSelectedThumbNailUrl] = useState<any>(null)
  const [selectedAvatarlUrl, setSelectedAvatarUrl] = useState<any>(null)
  const panelRef = useRef() as React.MutableRefObject<HTMLDivElement>

  const loadAvatarByURL = async (objectURL) => {
    try {
      const obj = await loadAvatarForPreview(entity, objectURL)
      if (!obj) {
        setAvatarModel(null!)
        setError('Failed to load')
        return
      }
      scene.add(obj)
      const error = validate(obj)
      setError(error)
      if (error === '') {
        setAvatarModel(obj)
        obj.name = 'avatar'
      }
    } catch (err) {
      console.error(err)
      setError(err)
    }
  }

  const handleThumbnailUrlChange = (event) => {
    event.preventDefault()
    setThumbnailUrl(event.target.value)
    if (REGEX_VALID_URL.test(event.target.value)) {
      fetch(event.target.value)
        .then((res) => res.blob())
        .then((data) => setSelectedThumbNailUrl(data))
        .catch((err) => {
          setError(err.message)
        })
    }
  }

  const handleAvatarUrlChange = async (event) => {
    event.preventDefault()
    setAvatarUrl(event.target.value)
    if (/\.(?:gltf|glb|vrm)/.test(event.target.value) && REGEX_VALID_URL.test(event.target.value)) {
      setValidAvatarUrl(true)
      loadAvatarByURL(event.target.value)
      fetch(event.target.value)
        .then((res) => res.blob())
        .then((data) => setSelectedAvatarUrl(data))
        .catch((err) => {
          setError(err.message)
        })
    } else {
      setValidAvatarUrl(false)
    }
  }

  const [fileSelected, setFileSelected] = useState(false)

  const { t } = useTranslation()

  useEffect(() => {
    if (document.getElementById('stage')) {
      const world = useWorld()
      entity = createEntity()
      addAnimationLogic(entity, world, panelRef)
      const init = initialize3D()
      scene = init.scene
      camera = init.camera
      renderer = init.renderer
      const controls = getOrbitControls(camera, renderer.domElement)

      controls.minDistance = 0.1
      controls.maxDistance = 10
      controls.target.set(0, 1.5, 0)
      controls.update()
      window.addEventListener('resize', () => onWindowResize({ scene, camera, renderer }))

      return () => {
        removeEntity(entity)
        entity = null!
        window.removeEventListener('resize', () => onWindowResize({ scene, camera, renderer }))
      }
    }
  }, [document.getElementById('stage')])

  const handleAvatarChange = (e) => {
    if (e.target.files[0].size < MIN_AVATAR_FILE_SIZE || e.target.files[0].size > MAX_AVATAR_FILE_SIZE) {
      setError(
        t('user:avatar.fileOversized', {
          minSize: MIN_AVATAR_FILE_SIZE / 1048576,
          maxSize: MAX_AVATAR_FILE_SIZE / 1048576
        })
      )
      return
    }

    scene.children = scene.children.filter((c) => c.name !== 'avatar')
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (fileData) => {
      try {
        const assetType = AssetLoader.getAssetType(file.name)
        if (assetType) {
          const objectURL = URL.createObjectURL(file) + '#' + file.name
          loadAvatarByURL(objectURL)
        }
      } catch (error) {
        console.error(error)
        setError(t('user:avatar.selectValidFile'))
      }
    }

    try {
      reader.readAsArrayBuffer(file)
      setFileSelected(true)
      setSelectedFile(e.target.files[0])
    } catch (error) {
      console.error(e)
      setError(t('user:avatar.selectValidFile'))
    }
  }

  const handleAvatarNameChange = (e) => {
    e.preventDefault()
    setAvatarName(e.target.value)
  }

  const uploadAvatar = async () => {
    if (avatarModel == null) return
    const thumbnailBlob = activeSourceType ? selectedThumbnail : selectedThumbnailUrl
    const avatarBlob = activeSourceType ? selectedFile : selectedAvatarlUrl

    if (thumbnailBlob == null) {
      await new Promise((resolve) => {
        const canvas = document.createElement('canvas')
        ;(canvas.width = THUMBNAIL_WIDTH), (canvas.height = THUMBNAIL_HEIGHT)
        const newContext = canvas.getContext('2d')
        newContext?.drawImage(renderer.domElement, 0, 0)
        canvas.toBlob((blob) => {
          AuthService.uploadAvatarModel(avatarBlob, blob!, avatarName, false).then(resolve)
        })
      })
    } else {
      await AuthService.uploadAvatarModel(avatarBlob, thumbnailBlob, avatarName, false)
    }

    setWidgetVisibility('Profile', true)
  }

  const handleThumbnailChange = (e) => {
    if (e.target.files[0].size < MIN_AVATAR_FILE_SIZE || e.target.files[0].size > MAX_AVATAR_FILE_SIZE) {
      setError(
        t('user:avatar.fileOversized', {
          minSize: MIN_AVATAR_FILE_SIZE / 1048576,
          maxSize: MAX_AVATAR_FILE_SIZE / 1048576
        })
      )
      return
    }

    try {
      setSelectedThumbnail(e.target.files[0])
    } catch (error) {
      console.error(e)
      setError(t('user:avatar.selectValidThumbnail'))
    }
  }

  const openAvatarMenu = (e) => {
    e.preventDefault()
    setWidgetVisibility('SelectAvatar', true)
  }

  const setWidgetVisibility = (widgetName: string, visibility: boolean) => {
    const widgetState = accessWidgetAppState()
    const widgets = Object.entries(widgetState.widgets.value).map(([id, widgetState]) => ({
      id,
      ...widgetState,
      ...Engine.instance.currentWorld.widgets.get(id)!
    }))

    const currentWidget = widgets.find((w) => w.label === widgetName)

    // close currently open widgets until we support multiple widgets being open at once
    for (let widget of widgets) {
      if (currentWidget && widget.id !== currentWidget.id) {
        dispatchAction(WidgetAppActions.showWidget({ id: widget.id, shown: false }))
      }
    }

    currentWidget && dispatchAction(WidgetAppActions.showWidget({ id: currentWidget.id, shown: visibility }))
  }

  const uploadButtonEnabled = !!fileSelected && !error && avatarName.length > 3

  return (
    <>
      <style>{styleString}</style>
      <div ref={panelRef} className="avatarUploadPanel">
        <div className="avatarHeaderBlock">
          <button type="button" xr-layer="true" className="iconBlock" onClick={openAvatarMenu}>
            <ArrowBack />
          </button>
          <h2>{t('user:avatar.title')}</h2>
        </div>
        <div className="stageContainer">
          <div
            id="stage"
            className="stage"
            style={{ width: THUMBNAIL_WIDTH + 'px', height: THUMBNAIL_HEIGHT + 'px' }}
          ></div>
        </div>
        {selectedThumbnail != null && (
          <div className="thumbnailContainer">
            <img
              src={URL.createObjectURL(selectedThumbnail)}
              alt={selectedThumbnail?.name}
              className="thumbnailPreview"
            />
          </div>
        )}
        {thumbnailUrl.length > 0 && (
          <div className="thumbnailContainer">
            <img src={thumbnailUrl} alt="Avatar" className="thumbnailPreview" />
          </div>
        )}
        <div className="paper2">
          <div className="inviteBox">
            <div className="inviteContainer">
              <input
                aria-invalid="false"
                id="avatarName"
                name="avatarname"
                type="text"
                className="inviteLinkInput"
                value={avatarName}
                onChange={handleAvatarNameChange}
                placeholder="Avatar Name"
              />
              <fieldset aria-hidden="true" className="linkFieldset">
                <legend className="linkLegend" />
              </fieldset>
            </div>
          </div>
        </div>
        <div className="tabRoot">
          <div
            onClick={() => {
              setActiveSourceType(0)
            }}
            className={`tab ${activeSourceType == 0 ? 'selectedTab' : ''}`}
          >
            Use URL
          </div>
          <div
            onClick={() => {
              setActiveSourceType(1)
            }}
            className={`tab ${activeSourceType == 1 ? 'selectedTab' : ''}`}
          >
            Upload Files
          </div>
        </div>
        {activeSourceType === 0 ? (
          <div className="controlContainer">
            <div className="selectBtns" style={{ margin: '14px 0' }}>
              <div className="inviteBox">
                <div className="inviteContainer">
                  <input
                    placeholder="Paste Avatar Url..."
                    className="inviteLinkInput"
                    value={avatarUrl}
                    onChange={handleAvatarUrlChange}
                  />
                  <fieldset aria-hidden="true" className="linkFieldset">
                    <legend className="linkLegend" />
                  </fieldset>
                </div>
              </div>
              <div className="inviteBox">
                <div className="inviteContainer">
                  <input
                    className="inviteLinkInput"
                    value={thumbnailUrl}
                    onChange={handleThumbnailUrlChange}
                    placeholder="Paste Thumbnail Url..."
                  />
                  <fieldset aria-hidden="true" className="linkFieldset">
                    <legend className="linkLegend" />
                  </fieldset>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="uploadBtn"
              onClick={uploadAvatar}
              xr-layer="true"
              disabled={!validAvatarUrl}
              style={{ cursor: !validAvatarUrl ? 'not-allowed' : 'pointer' }}
            >
              {t('user:avatar.lbl-upload')}
              <CloudUpload />
            </button>
          </div>
        ) : (
          <>
            {error.length > 0 && (
              <div className="selectLabelContainer">
                <div className="avatarSelectError">{error}</div>
              </div>
            )}
            <div className="controlContainer">
              <div className="selectBtns">
                <label htmlFor="contained-button-file">
                  <input
                    accept={AVATAR_FILE_ALLOWED_EXTENSIONS}
                    id="contained-button-file"
                    type="file"
                    className="uploadInput"
                    onChange={handleAvatarChange}
                  />
                  <button className="rootBtn">
                    {t('user:avatar.avatar')} <SystemUpdateAlt />
                  </button>
                </label>
                <label htmlFor="contained-button-file-t">
                  <input
                    accept={THUMBNAIL_FILE_ALLOWED_EXTENSIONS}
                    id="contained-button-file-t"
                    className="uploadInput"
                    type="file"
                    onChange={handleThumbnailChange}
                  />
                  <button className="rootBtn">
                    {t('user:avatar.lbl-thumbnail')}
                    <AccountCircle />
                  </button>
                </label>
              </div>
              <button
                type="button"
                className="uploadBtn"
                xr-layer="true"
                onClick={uploadAvatar}
                style={{ cursor: uploadButtonEnabled ? 'pointer' : 'not-allowed' }}
                disabled={!uploadButtonEnabled}
              >
                {t('user:avatar.lbl-upload')}
                <CloudUpload />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default UploadAvatarMenu
