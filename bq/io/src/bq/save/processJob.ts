import Queue from 'bee-queue'
import { admin } from '../../firebase'
import { v4 as uuid } from 'uuid'
import atob from 'atob'

type SaveGraphJobData = {
  graphId: string
  solutionId: string
  revision: string
  graphJson: string // json string of nodepen graph elements
  graphBinaries: string // base64 string of bytearray
  graphSolution: string // json string of solution geometry and messages
}

export const processJob = async (
  job: Queue.Job<SaveGraphJobData>
): Promise<unknown> => {
  const {
    graphId,
    solutionId,
    graphBinaries,
    graphJson,
    graphSolution,
    revision,
  } = job.data

  const jobId = job.id.padStart(4, '0')
  const jobLabel = `[ JOB ${jobId} ] [ IO:SAVE ]`

  console.log(`${jobLabel} [ START ]`)
  console.log(`${jobLabel} ${graphId} / ${solutionId}`)

  const bucket = admin.storage().bucket('np-graphs')

  const pathRoot = `${graphId}/${solutionId}`

  // Create solution .json file
  const solutionFilePath = `${pathRoot}/${uuid()}.json`
  const solutionFile = bucket.file(solutionFilePath)

  const solutionFileData = JSON.stringify(JSON.parse(graphSolution), null, 2)

  // Create .gh file
  const ghFilePath = `${pathRoot}/${uuid()}.gh`
  const ghFile = bucket.file(ghFilePath)

  let ghFileData: any = atob(graphBinaries)

  const bytes = new Array(ghFileData.length)
  for (let i = 0; i < ghFileData.length; i++) {
    bytes[i] = ghFileData.charCodeAt(i)
  }
  ghFileData = new Uint8Array(bytes)

  // Upload graph files
  const uploadResult = await Promise.allSettled([
    solutionFile.save(solutionFileData),
    ghFile.save(ghFileData),
  ])

  // Get url for response
  const graphBinariesUrl = process?.env?.DEBUG
    ? ghFile.publicUrl()
    : (
        await ghFile.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000,
        })
      )[0]

  // Update revision record
  const fb = admin.firestore()

  const versionRef = fb
    .collection('graphs')
    .doc(graphId)
    .collection('revisions')
    .doc(revision.toString())
  const versionDoc = await versionRef.get()

  if (versionDoc.exists) {
    await versionRef.update(
      'files.graphBinaries',
      ghFilePath,
      'files.graphSolutionJson',
      solutionFilePath
    )
  }

  return { ...job.data, graphBinariesUrl }
}
