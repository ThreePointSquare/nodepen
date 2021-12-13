import { NodePen, assert } from 'glib'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '$'
import { GraphState, Payload, LiveWireElement } from './types'
import {
  newGuid,
  initializeParameters,
  findAttachedWires,
  getElementExtents,
  regionContainsRegion,
  regionIntersectsRegion,
  getDataTreePathString,
} from '../../utils'
import { GraphMode } from './types/GraphMode'
import { deleteWire, getAnchorCoordinates, getConnectedWires } from './utils'
import { prepareLiveMotion, updateLiveElement } from './reducers'

const initialState: GraphState = {
  manifest: {
    id: 'unset',
    name: 'unset',
    author: {
      name: 'unset',
      id: 'N/A',
    },
    graph: {
      elements: {},
      solution: {} as any,
    },
    files: {},
  },
  elements: {},
  selection: [],
  mode: 'idle',
  registry: {
    latest: {
      element: 'unset',
    },
    visibility: {
      elements: [],
    },
    restored: {
      elements: [],
    },
    move: {
      elements: [],
      fromWires: [],
      toWires: [],
    },
    wire: {
      primary: 'unset',
      origin: {
        elementId: 'unset',
        parameterId: 'unset',
      },
    },
  },
}

export const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    reset: (state: GraphState) => {
      state.elements = {}
      state.selection = []
    },
    restore: (state: GraphState, action: PayloadAction<NodePen.GraphManifest>) => {
      const { graph } = action.payload

      // Update local manifest
      state.manifest = action.payload

      // Restore graph elements
      state.elements = graph.elements

      // TODO: Solution values...

      // Flag restored objects as not needing first-placement correction
      state.registry.restored.elements = Object.keys(graph.elements)
    },
    addElement: (state: GraphState, action: PayloadAction<Payload.AddElementPayload<NodePen.ElementType>>) => {
      const id = newGuid()

      state.registry.latest.element = id

      switch (action.payload.type) {
        case 'static-component': {
          const template = action.payload.template as NodePen.Element<'static-component'>['template']

          const [sources, values, inputs, outputs] = initializeParameters(template)

          const element: NodePen.Element<'static-component'> = {
            id,
            template,
            current: {
              settings: {
                solution: 'deferred',
                visibility: 'visible',
                execution: 'enabled',
              },
              values,
              sources,
              anchors: {},
              position: action.payload.position,
              dimensions: {
                width: 50,
                height: 50,
              },
              inputs,
              outputs,
            },
          }

          if (action.payload.data) {
            element.current = { ...element.current, ...action.payload.data }
          }

          state.elements[id] = element
          break
        }
        case 'region': {
          const template = action.payload.template as NodePen.Element<'region'>['template']

          const element: NodePen.Element<'region'> = {
            id,
            template,
            current: {
              dimensions: {
                width: 0,
                height: 0,
              },
              position: action.payload.position,
              from: [...action.payload.position],
              to: [...action.payload.position],
              selection: {
                mode: 'default',
              },
            },
          }

          state.elements[id] = element
          break
        }
        case 'number-slider': {
          const template = action.payload.template as NodePen.Element<'number-slider'>['template']

          const path = getDataTreePathString([0])

          const element: NodePen.Element<'number-slider'> = {
            id,
            template,
            current: {
              settings: {
                solution: 'immediate',
                visibility: 'visible',
                execution: 'enabled',
              },
              dimensions: {
                width: 300,
                height: 42,
              },
              position: action.payload.position,
              anchors: {},
              sources: {},
              values: {
                output: {
                  [path]: [
                    {
                      type: 'number',
                      value: 0.25,
                    },
                  ],
                },
              },
              inputs: {},
              outputs: {
                output: 0,
              },
              rounding: 'rational',
              domain: [0, 1],
              precision: 3,
            },
          }

          if (action.payload.data) {
            element.current = { ...element.current, ...action.payload.data }
          }

          state.elements[id] = element
          break
        }
        case 'panel': {
          const template = action.payload.template as NodePen.Element<'panel'>['template']

          const path = getDataTreePathString([0])

          const element: NodePen.Element<'panel'> = {
            id,
            template,
            current: {
              settings: {
                visibility: 'visible',
                solution: 'immediate',
                execution: 'enabled',
              },
              isMultilineData: true,
              dimensions: {
                width: 250,
                height: 150,
              },
              position: action.payload.position,
              anchors: {},
              sources: {
                input: [],
              },
              values: {
                output: {
                  [path]: [
                    {
                      type: 'text',
                      value: 'Double click to edit panel content...',
                    },
                  ],
                },
              },
              inputs: {},
              outputs: {
                output: 0,
              },
            },
          }

          if (action.payload.data) {
            element.current = { ...element.current, ...action.payload.data }
          }

          state.elements[id] = element
          break
        }
        default: {
          console.log(`🐍🐍🐍 Cannot handle element type ${action.payload.type} in 'addElement'.`)
          break
        }
      }
    },
    addLiveElement: (state: GraphState, action: PayloadAction<Payload.AddElementPayload<NodePen.ElementType>>) => {
      const id = newGuid()

      switch (action.payload.type) {
        case 'annotation': {
          const template = action.payload.template as NodePen.Element<'annotation'>['template']

          const element: NodePen.Element<'annotation'> = {
            id,
            template,
            current: {
              position: action.payload.position,
              dimensions: action.payload.data?.dimensions ?? {
                width: 0,
                height: 0,
              },
            },
          }

          state.elements[id] = element
          break
        }
        case 'region': {
          const template = action.payload.template as NodePen.Element<'region'>['template']

          const element: NodePen.Element<'region'> = {
            id,
            template,
            current: {
              dimensions: {
                width: 0,
                height: 0,
              },
              position: action.payload.position,
              from: [...action.payload.position],
              to: [...action.payload.position],
              selection: {
                mode: 'default',
              },
            },
          }

          state.elements[id] = element
          break
        }
        default: {
          console.log(`🐍🐍🐍 Cannot handle element type ${action.payload.type} in 'addLiveElement'.`)
          break
        }
      }
    },
    deleteElements: (state: GraphState, action: PayloadAction<string[]>) => {
      action.payload.forEach((id) => {
        const element = state.elements[id]

        if (!element) {
          return
        }

        // Clear wires and sources
        const [fromWires, toWires] = getConnectedWires(state, element.id)
        const wires = [...fromWires, ...toWires]

        wires.forEach((wireId) => {
          deleteWire(state, wireId)
        })

        // Delete the specified element
        delete state.elements[id]
      })
    },
    deleteLiveElements: (state: GraphState, action: PayloadAction<string[]>) => {
      action.payload.forEach((id) => {
        if (!state.elements[id]) {
          return
        }

        delete state.elements[id]
      })
    },
    moveElement: (state: GraphState, action: PayloadAction<Payload.MoveElementPayload>) => {
      const { id, position } = action.payload

      const element = state.elements[id]

      if (!element) {
        return
      }

      // Apply motion to connected wires
      const wires = Object.values(state.elements).filter((element) =>
        assert.element.isWire(element)
      ) as NodePen.Element<'wire'>[]

      const [fromWires, toWires] = findAttachedWires(wires, id)

      fromWires.forEach((wireId) => {
        const wire = state.elements[wireId]

        if (!assert.element.isWire(wire)) {
          return
        }

        const parameter = wire.template.from!.parameterId

        const data = element.current

        if (!assert.element.isGripElement(data)) {
          return
        }

        const [x, y] = position
        const [dx, dy] = data.anchors[parameter]

        wire.current.from = [x + dx, y + dy]
      })

      toWires.forEach((wireId) => {
        const wire = state.elements[wireId]

        if (!assert.element.isWire(wire)) {
          return
        }

        const parameter = wire.template.to!.parameterId

        const data = element.current

        if (!assert.element.isGripElement(data)) {
          return
        }

        const [x, y] = position
        const [dx, dy] = data.anchors[parameter]

        wire.current.to = [x + dx, y + dy]
      })

      // Apply motion to element
      element.current.position = position
    },
    updateSelection: (state: GraphState, action: PayloadAction<Payload.UpdateSelectionPayload>) => {
      const { mode } = action.payload

      const SELECTABLE_ELEMENTS: NodePen.ElementType[] = [
        'static-component',
        'static-parameter',
        'panel',
        'number-slider',
      ]

      type SelectableElement = NodePen.Element<'static-component'> | NodePen.Element<'static-parameter'>

      const stagedElementIds: string[] = []

      // Stage elements for selection update operation
      switch (action.payload.type) {
        case 'id': {
          const { ids } = action.payload
          stagedElementIds.push(...ids)
          break
        }
        case 'region': {
          const { includeIntersection, region } = action.payload

          const candidates = Object.values(state.elements).filter((element): element is SelectableElement =>
            SELECTABLE_ELEMENTS.includes(element.template.type)
          )

          candidates.forEach((element) => {
            const [min, max] = getElementExtents(element)
            let captured = false

            if (regionContainsRegion([region.from, region.to], [min, max])) {
              stagedElementIds.push(element.id)
              captured = true
            }

            if (captured) {
              return
            }

            if (includeIntersection && regionIntersectsRegion([region.from, region.to], [min, max])) {
              stagedElementIds.push(element.id)
            }
          })

          break
        }
      }

      // console.log(`Selection captured ${stagedElementIds.length} elements!`)

      const nextSelection: string[] = []

      // Perform selection update
      switch (mode) {
        case 'default': {
          nextSelection.push(...stagedElementIds)
          //state.selection = stagedElementIds
          break
        }
        case 'add': {
          const validStagedElementIds = stagedElementIds.filter((id) => !state.selection.includes(id))
          // state.selection = [...state.selection, ...validStagedElementIds]
          nextSelection.push(...state.selection)
          nextSelection.push(...validStagedElementIds)
          break
        }
        case 'remove': {
          const next = state.selection.filter((id) => !stagedElementIds.includes(id))
          nextSelection.push(...next)
          break
        }
        case 'toggle': {
          let currentSelection = [...state.selection]

          stagedElementIds.forEach((id) => {
            if (currentSelection.includes(id)) {
              currentSelection = currentSelection.filter((selectedId) => selectedId !== id)
            } else {
              currentSelection.push(id)
            }
          })

          nextSelection.push(...currentSelection)
          break
        }
      }

      prepareLiveMotion(state, 'unset', nextSelection)

      state.selection = nextSelection
    },
    updateElement: (state: GraphState, action: PayloadAction<Payload.UpdateElementPayload<NodePen.ElementType>>) => {
      const { id, type, data } = action.payload

      const element = state.elements[id]

      // Make sure element exists
      if (!element) {
        console.log(`🐍 Attempted to update an element that doesn't exist!`)
        return
      }

      if (element.template.type !== type) {
        console.log(`🐍 Attempted to update data for element with the wrong data type!`)
        return
      }

      element.current = { ...element.current, ...data }
    },
    batchUpdateLiveElement: (
      state: GraphState,
      action: PayloadAction<Payload.UpdateElementPayload<NodePen.ElementType>[]>
    ) => {
      for (const payload of action.payload) {
        updateLiveElement(state, payload)
      }
    },
    updateLiveElement: (
      state: GraphState,
      action: PayloadAction<Payload.UpdateElementPayload<NodePen.ElementType>>
    ) => {
      updateLiveElement(state, action.payload)
    },
    startLiveWires: (state: GraphState, action: PayloadAction<Payload.StartLiveWiresPayload>) => {
      const { templates, origin } = action.payload

      state.registry.wire.capture = undefined
      state.registry.wire.origin = origin

      templates.forEach((template, i) => {
        if (template.mode !== 'live') {
          return
        }

        const id = newGuid()

        if (i === 0) {
          state.registry.wire.primary = id
        }

        const { elementId, parameterId } = template?.from ?? template.to

        const { current } = state.elements[elementId]

        if (!current || !assert.element.isGripElement(current)) {
          // No anchors
          console.log('🐍🐍🐍 Anchor element does not exist!')
          return
        }

        const [x, y] = current.position
        const [dx, dy] = current.anchors[parameterId]

        const [wx, wy] = [x + dx, y + dy]

        const wire: NodePen.Element<'wire'> = {
          id,
          current: {
            from: [wx, wy],
            to: [wx, wy],
            position: [0, 0],
            dimensions: {
              width: 0,
              height: 0,
            },
          },
          template,
        }

        state.elements[id] = wire
      })
    },
    updateLiveWires: (state: GraphState, action: PayloadAction<[x: number, y: number]>) => {
      const position = action.payload

      // If wires are currently captured, do no work
      if (state.registry.wire.capture) {
        return
      }

      const wires = Object.values(state.elements).filter(
        (element) => element.template.type === 'wire' && element.template.mode === 'live'
      )

      wires.forEach((wire) => {
        const { current, template } = wire as NodePen.Element<'wire'>

        if (template.mode !== 'live') {
          return
        }

        const updateTarget = template.from ? 'to' : 'from'

        current[updateTarget] = position
      })
    },
    captureLiveWires: (state: GraphState, action: PayloadAction<Payload.CaptureLiveWiresPayload>) => {
      const { type, elementId, parameterId } = action.payload

      if (state.registry.wire.origin.elementId === elementId) {
        // Components cannot connect to themselves, that's illegal
        return
      }

      const captureType = type === 'input' ? 'to' : 'from'

      const wires = Object.values(state.elements).filter(
        (element) => element.template.type === 'wire' && element.template.mode === 'live'
      )

      if (wires.length === 0) {
        return
      }

      wires.forEach((wire) => {
        const { current, template } = wire as NodePen.Element<'wire'>

        if (template.mode !== 'live') {
          return
        }

        if (template[captureType]) {
          // Cannot attempt a connection between two inputs or two outputs
          return
        }

        const captureElement = state.elements[elementId]

        if (!captureElement) {
          return
        }

        if (!assert.element.isGripElement(captureElement.current)) {
          return
        }

        const [x, y] = captureElement.current.position
        const [dx, dy] = captureElement.current.anchors[parameterId]

        // Declare capture
        state.registry.wire.capture = { elementId, parameterId }

        // Update wire position
        const updateTarget = template.from ? 'to' : 'from'
        current[updateTarget] = [x + dx, y + dy]
      })
    },
    releaseLiveWires: (state: GraphState) => {
      state.registry.wire.capture = undefined
    },
    endLiveWires: (state: GraphState, action: PayloadAction<Payload.EndLiveWiresPayload>) => {
      const wires: LiveWireElement[] = []
      const sourceElements: NodePen.Element<'static-component' | 'number-slider' | 'panel'>[] = []

      for (const element of Object.values(state.elements)) {
        if (element.template.type === 'wire' && element.template.mode === 'live') {
          wires.push(element as LiveWireElement)
        }

        const graphElements: NodePen.ElementType[] = ['static-component', 'number-slider', 'panel']

        if (graphElements.includes(element.template.type)) {
          sourceElements.push(element as any)
        }
      }

      if (action.payload.mode === 'cancel' || !state.registry.wire.capture || wires.length === 0) {
        // Connection not made, end and remove live wires
        wires.map((wire) => wire.id).forEach((id) => delete state.elements[id])
        return
      }

      // if (!state.registry.wire.capture && action.payload.end) {
      //   // Failed to capture, but we are being asked to try our best
      //   const [x, y] = action.payload.end
      //   const lookingFor = wires[0].template.from ? 'input' : 'output'

      //   for (const element of sourceElements) {
      //     if (state.registry.wire.capture) {
      //       // Early termination
      //       break
      //     }

      //     const relevantAnchors = Object.keys(element.current[`${lookingFor}s`])

      //     for (const id of relevantAnchors) {
      //       const [ex, ey] = element.current.position
      //       const [dx, dy] = element.current.anchors[id]

      //       // Get anchor position
      //       const [ax, ay] = [ex + dx, ey + dy]

      //       // Measure distance to final position
      //       const dist = distance([x, y], [ax, ay])

      //       if (dist < 20) {
      //         // Set this as the capture
      //         state.registry.wire.capture = { elementId: element.id, parameterId: id }
      //         break
      //       }
      //     }
      //   }
      // }

      // Remove expired connections if performing a transpose
      if (wires[0].template.transpose) {
        const { origin } = state.registry.wire

        const [existingFrom, existingTo] = getConnectedWires(state, origin.elementId, origin.parameterId)

        // Remove origin as source from all relevant targets
        existingFrom.forEach((fromId) => {
          const fromWire = state.elements[fromId]

          if (!assert.element.isWire(fromWire)) {
            return
          }

          if (fromWire.template.mode === 'live') {
            return
          }

          const { from: expiredFrom, to: expiredTo } = fromWire.template

          const expiredToElement = state.elements[expiredTo.elementId]

          if (!expiredToElement || !assert.element.isGraphElement(expiredToElement.current)) {
            return
          }

          // Filter out expired sources
          expiredToElement.current.sources[expiredTo.parameterId] = expiredToElement.current.sources[
            expiredTo.parameterId
          ].filter(
            (source) =>
              source.elementInstanceId !== expiredFrom.elementId &&
              source.parameterInstanceId !== expiredFrom.parameterId
          )

          // Delete expired wire
          delete state.elements[fromId]
        })

        // Remove all sources if origin is an input
        if (existingTo.length > 0) {
          const originElement = state.elements[origin.elementId]

          if (!originElement || !assert.element.isGraphElement(originElement.current)) {
            return
          }

          // Clear sources
          originElement.current.sources[origin.parameterId] = []

          // Delete expired wires
          existingTo.forEach((toId) => {
            delete state.elements[toId]
          })
        }
      }

      // Update connections based on current mode
      wires.forEach((wire) => {
        const { template } = wire

        if (!state.registry.wire.capture) {
          console.log(`ℹ Live wires ended without a successful capture.`)
          return
        }

        const mode = template.transpose ? 'transpose' : action.payload.mode
        const capture = state.registry.wire.capture

        // Declare incoming connection
        const [from, to] = [template?.from ?? capture, template?.to ?? capture]

        // Verify `toElement` is a `GraphElement` with sources
        const toElement = state.elements[to.elementId]

        if (!toElement) {
          console.log("🐍 Attempted to make a connection `to` an element that doesn't exist!")
          return
        }

        if (!assert.element.isGraphElement(toElement.current)) {
          console.log('🐍 Attempted to make a connection `to` and element that is not a graph element!')
          return
        }

        if (!toElement.current.sources[to.parameterId]) {
          // This should not happen
          console.log(`🐍 Sources array did not exist for a valid connection attempt.`)
          toElement.current.sources[to.parameterId] = []
        }

        const [fx, fy] = getAnchorCoordinates(state, from.elementId, from.parameterId)
        const [tx, ty] = getAnchorCoordinates(state, to.elementId, to.parameterId)

        switch (mode) {
          // Replace all `toElement` sources with new connection only
          case 'default': {
            // Identify all existing connections at `toElement` parameter
            const [, existingConnections] = getConnectedWires(state, to.elementId, to.parameterId)

            existingConnections.forEach((connectionId) => {
              const connectionWire = state.elements[connectionId]

              if (!assert.element.isWire(connectionWire)) {
                console.log(`🐍 Found an existing 'wire' connection that is not actually a wire!`)
                return
              }

              if (connectionWire.template.mode === 'live') {
                console.log(`🐍 Found an existing connection with a live wire we failed to clean up!`)
                delete state.elements[connectionId]
                return
              }

              const { from, to } = connectionWire.template

              // Filter this source out of the `toElement` sources
              if (!assert.element.isGraphElement(toElement.current)) {
                return
              }

              toElement.current.sources[to.parameterId] = toElement.current.sources[to.parameterId].filter(
                (source) =>
                  source.elementInstanceId !== from.elementId && source.parameterInstanceId !== from.parameterId
              )

              // Delete this wire connection
              delete state.elements[connectionId]
            })

            // Add new connection to `toElement` sources
            if (
              toElement.current.sources[to.parameterId].find(
                (source) =>
                  source.elementInstanceId === from.elementId && source.parameterInstanceId === from.parameterId
              )
            ) {
              // Connection already exists
              // TODO: Perform this check on capture?
              return
            }

            toElement.current.sources[to.parameterId].push({
              elementInstanceId: from.elementId,
              parameterInstanceId: from.parameterId,
            })

            // Create a new wire for this connection
            const newConnectionId = newGuid()

            const newConnectionWire: NodePen.Element<'wire'> = {
              id: newConnectionId,
              current: {
                from: [fx, fy],
                to: [tx, ty],
                position: [0, 0],
                dimensions: {
                  width: 0,
                  height: 0,
                },
              },
              template: {
                type: 'wire',
                mode: 'data',
                from,
                to,
              },
            }

            state.elements[newConnectionId] = newConnectionWire
            break
          }
          // Transpose cleanup has already been performed, safely add new connections
          case 'transpose':
          // Merge new connection with any existing ones
          /* eslint-disable-next-line */
          case 'add': {
            // Update `toElement` parameter sources
            const sources = toElement.current.sources[to.parameterId]

            if (
              sources.find(
                (source) =>
                  source.elementInstanceId === from.elementId && source.parameterInstanceId === from.parameterId
              )
            ) {
              // Connection already exists
              // TODO: Perform this check on capture?
              return
            }

            sources.push({ elementInstanceId: from.elementId, parameterInstanceId: from.parameterId })

            // Create wire for connection
            const id = newGuid()

            const connectionWire: NodePen.Element<'wire'> = {
              id,
              current: {
                from: [fx, fy],
                to: [tx, ty],
                position: [0, 0],
                dimensions: {
                  width: 0,
                  height: 0,
                },
              },
              template: {
                type: 'wire',
                mode: 'data',
                from,
                to,
              },
            }

            state.elements[id] = connectionWire
            break
          }
          // Remove any connections that match the incoming one
          case 'remove': {
            const wires = Object.values(state.elements).filter(
              (element) => element.template.type === 'wire' && element.template.mode !== 'live'
            )

            const connections = wires.filter((wire) => {
              if (!assert.element.isWire(wire)) {
                return
              }

              if (wire.template.mode === 'live') {
                return
              }

              const {
                from: { elementId: fromElementId, parameterId: fromParameterId },
                to: { elementId: toElementId, parameterId: toParameterId },
              } = wire.template

              const tests: boolean[] = [
                from.elementId === fromElementId,
                from.parameterId === fromParameterId,
                to.elementId === toElementId,
                to.parameterId === toParameterId,
              ]

              const connectionMatches = !tests.some((test) => !test)

              return connectionMatches
            })

            connections.forEach((connection) => {
              if (!assert.element.isWire(connection)) {
                return
              }

              if (connection.template.mode === 'live') {
                return
              }

              const { from: connectionFrom, to: connectionTo } = connection.template

              const toElement = state.elements[connectionTo.elementId]

              if (!toElement) {
                return
              }

              if (!assert.element.isGraphElement(toElement.current)) {
                return
              }

              const { sources } = toElement.current

              sources[connectionTo.parameterId] = sources[connectionTo.parameterId].filter(
                (source) =>
                  source.elementInstanceId !== connectionFrom.elementId &&
                  source.parameterInstanceId !== connectionFrom.parameterId
              )

              delete state.elements[connection.id]
            })

            break
          }
        }

        // Delete live wire
        delete state.elements[wire.id]
      })

      // Clear registry
      state.registry.wire.capture = undefined

      // Update selection, if applicable
      if (state.selection.length > 0) {
        prepareLiveMotion(state, 'selection', state.selection)
      }
    },
    setProvisionalWire: (state: GraphState, action: PayloadAction<Payload.ProvisionalWirePayload>) => {
      const { from, to } = action.payload

      const fromElement = state.elements[from.elementId]
      const toElement = state.elements[to.elementId]

      if (!fromElement || !toElement) {
        return
      }

      const fromElementData = fromElement.current
      const toElementData = toElement.current

      if (!assert.element.isGripElement(fromElementData) || !assert.element.isGripElement(toElementData)) {
        return
      }

      const [ax, ay] = fromElement.current.position
      const [adx, ady] = fromElementData.anchors[from.parameterId]

      const [bx, by] = toElement.current.position
      const [bdx, bdy] = toElementData.anchors[to.parameterId]

      const wire: NodePen.Element<'wire'> = {
        id: 'provisional-wire',
        template: {
          type: 'wire',
          mode: 'provisional',
          from,
          to,
        },
        current: {
          from: [ax + adx, ay + ady],
          to: [bx + bdx, by + bdy],
          position: [0, 0],
          dimensions: {
            width: 0,
            height: 0,
          },
        },
      }

      state.elements['provisional-wire'] = wire
    },
    clearProvisionalWire: (state: GraphState) => {
      delete state.elements['provisional-wire']
    },
    prepareLiveMotion: (state: GraphState, action: PayloadAction<Payload.PrepareLiveMotionPayload>) => {
      const { anchor, targets } = action.payload

      if (state.selection.includes(anchor)) {
        // Live motion is staged when selection changes. If anchor element is included, skip redundant work.
        state.registry.move.elements = state.registry.move.elements.filter((id) => id !== anchor)
        return
      }

      prepareLiveMotion(state, anchor, targets)

      // Given a target element that is about to move, cache information about
      // other live motion that must follow it.

      // Identify all connected wires
      // const wires = Object.values(state.elements).filter((element) =>
      //   assert.element.isWire(element)
      // ) as NodePen.Element<'wire'>[]
      // const [fromWires, toWires] = findAttachedWires(wires, targetId)

      // state.registry.move.fromWires = fromWires
      // state.registry.move.toWires = toWires

      // Note: we do not have to clean up the registry because it is always refreshed before it's needed
    },
    dispatchLiveMotion: (state: GraphState, action: PayloadAction<[dx: number, dy: number]>) => {
      // Apply live motion to all elements cached by `prepareLiveMotion`
      // All static actions at the end of the motion should succeed regardless of action here
      // (i.e. we should be able to 'skip' live frames)
      const [dx, dy] = action.payload

      const { fromWires, toWires, elements } = state.registry.move

      fromWires.forEach((id) => {
        const wire = state.elements[id]

        if (!wire || !assert.element.isWire(wire)) {
          return
        }

        const [x, y] = wire.current.from

        wire.current.from = [x + dx, y + dy]
      })

      toWires.forEach((id) => {
        const wire = state.elements[id]

        if (!wire || !assert.element.isWire(wire)) {
          return
        }

        const [x, y] = wire.current.to

        wire.current.to = [x + dx, y + dy]
      })

      elements.forEach((id) => {
        const element = state.elements[id]

        if (!element || !assert.element.isVisibleElement(element.current)) {
          return
        }

        const [x, y] = element.current.position

        element.current.position = [x + dx, y + dy]
      })
    },
    setMode: (state: GraphState, action: PayloadAction<GraphMode>) => {
      const mode = action.payload

      state.mode = mode
    },
    toggleVisibility: (state: GraphState, action: PayloadAction<Payload.ToggleVisibilityPayload>) => {
      const { ids } = action.payload

      for (const id of ids) {
        const element = state.elements[id]

        if (!element || !('settings' in element.current)) {
          // Element does not have a visibility setting
          continue
        }

        const { visibility } = element.current.settings

        element.current.settings.visibility = visibility === 'visible' ? 'hidden' : 'visible'
      }
    },
    setVisibility: (state: GraphState, action: PayloadAction<Payload.SetVisibilityPayload>) => {
      const { ids, visibility: incomingVisibility } = action.payload

      state.registry.visibility.elements = []

      for (const id of ids) {
        const element = state.elements[id]

        if (!element || !('settings' in element.current)) {
          continue
        }

        const { visibility: currentVisibility } = element.current.settings

        if (currentVisibility === incomingVisibility) {
          continue
        }

        state.registry.visibility.elements.push(id)
        element.current.settings.visibility = incomingVisibility
      }
    },
    registerElement: (state: GraphState, action: PayloadAction<Payload.RegisterElementPayload>) => {
      const { id, dimensions, adjustment } = action.payload

      if (!state.elements[id]) {
        return
      }

      const [width, height] = dimensions

      state.elements[id].current.dimensions = { width, height }

      if (!adjustment || state.registry.restored.elements.includes(id)) {
        return
      }

      const [x, y] = state.elements[id].current.position
      const [dx, dy] = adjustment

      state.elements[id].current.position = [x + dx, y + dy]
    },
    registerElementAnchor: (state: GraphState, action: PayloadAction<Payload.RegisterElementAnchorPayload>) => {
      const { elementId, anchorId, position } = action.payload

      if (!state.elements[elementId]) {
        return
      }

      const { current } = state.elements[elementId]

      if (!assert.element.isGripElement(current)) {
        return
      }

      current.anchors[anchorId] = position
    },
  },
})

const selectElements = (state: RootState): { [id: string]: NodePen.Element<NodePen.ElementType> } =>
  state.graph.present.elements
const selectSelection = (state: RootState): string[] => state.graph.present.selection
const selectMode = (state: RootState): GraphMode => state.graph.present.mode

const selectPrimaryWire = (state: RootState): string => state.graph.present.registry.wire.primary
const selectLiveWiresOrigin = (state: RootState): GraphState['registry']['wire']['origin'] =>
  state.graph.present.registry.wire.origin

const selectGraphId = (state: RootState): string => state.graph.present.manifest.id
const selectGraphAuthor = (state: RootState): string => state.graph.present.manifest.author.name
const selectGraphHistory = (state: RootState): { canUndo: boolean; canRedo: boolean } => {
  return {
    canUndo: state.graph.past.length > 0,
    canRedo: state.graph.future.length > 0,
  }
}

const selectVisibilityRegistry = (state: RootState): string[] => state.graph.present.registry.visibility.elements

export const graphSelectors = {
  selectElements,
  selectSelection,
  selectMode,
  selectPrimaryWire,
  selectLiveWiresOrigin,
  selectGraphId,
  selectGraphAuthor,
  selectGraphHistory,
  selectVisibilityRegistry,
}

const { actions, reducer } = graphSlice

export const graphActions = actions

export const graphReducer = reducer
