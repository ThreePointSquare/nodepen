import type * as NodePen from '@nodepen/core'
import { newGuid } from '../common'
import { getNodeHeight, getNodeWidth } from '../node-dimensions'
import { divideDomain, remap } from '../numerics'
import { DIMENSIONS } from '@/constants'

const { NODE_INTERNAL_PADDING } = DIMENSIONS

export const createInstance = (template: NodePen.NodeTemplate): NodePen.DocumentNode => {
  const { guid, inputs: templateInputs, outputs: templateOutputs } = template

  const nodeWidth = getNodeWidth()
  const nodeHeight = getNodeHeight(template)

  const node: NodePen.DocumentNode = {
    instanceId: newGuid(),
    templateId: guid,
    position: {
      x: 0,
      y: 0,
    },
    dimensions: {
      width: nodeWidth,
      height: nodeHeight,
    },
    status: {
      isEnabled: true,
      isProvisional: false,
    },
    anchors: {},
    values: {},
    sources: {},
    inputs: {},
    outputs: {},
  }

  for (const input of templateInputs) {
    const { __order: order } = input

    const inputInstanceId = newGuid()

    node.values[inputInstanceId] = {}
    node.sources[inputInstanceId] = []
    node.inputs[inputInstanceId] = order
  }

  const inputInstanceIds = Object.keys(node.inputs)
  const inputHeightSegments = divideDomain(
    [0, nodeHeight - NODE_INTERNAL_PADDING * 2],
    inputInstanceIds.length > 0 ? inputInstanceIds.length : 1
  )

  for (let i = 0; i < inputInstanceIds.length; i++) {
    const currentId = inputInstanceIds[i]
    const currentDomain = inputHeightSegments[i]

    const deltaX = 0
    const deltaY = remap(0.5, [0, 1], currentDomain) + NODE_INTERNAL_PADDING

    node.anchors[currentId] = {
      dx: deltaX,
      dy: deltaY,
    }
  }

  for (const output of templateOutputs) {
    const { __order: order } = output

    const outputInstanceId = newGuid()

    node.outputs[outputInstanceId] = order
  }

  const outputInstanceIds = Object.keys(node.outputs)
  const outputHeightSegments = divideDomain(
    [0, nodeHeight - NODE_INTERNAL_PADDING * 2],
    outputInstanceIds.length > 0 ? outputInstanceIds.length : 1
  )

  for (let i = 0; i < outputInstanceIds.length; i++) {
    const currentId = outputInstanceIds[i]
    const currentDomain = outputHeightSegments[i]

    const deltaX = nodeWidth
    const deltaY = remap(0.5, [0, 1], currentDomain) + NODE_INTERNAL_PADDING

    node.anchors[currentId] = {
      dx: deltaX,
      dy: deltaY,
    }
  }

  return node
}
