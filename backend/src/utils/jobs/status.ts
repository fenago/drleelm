/**
 * Simple in-memory job status store
 * Allows polling to detect job completion/failure when WebSocket fails
 */

type JobStatus = {
  id: string
  status: 'pending' | 'running' | 'done' | 'error'
  result?: any
  error?: string
  createdAt: number
  updatedAt: number
}

const jobs = new Map<string, JobStatus>()

// Auto-cleanup after 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.updatedAt > CLEANUP_INTERVAL) {
      jobs.delete(id)
    }
  }
}, 60000)

export function createJob(id: string): JobStatus {
  const job: JobStatus = {
    id,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  jobs.set(id, job)
  return job
}

export function updateJob(id: string, update: Partial<JobStatus>): JobStatus | null {
  const job = jobs.get(id)
  if (!job) return null
  Object.assign(job, update, { updatedAt: Date.now() })
  return job
}

export function setJobRunning(id: string): void {
  updateJob(id, { status: 'running' })
}

export function setJobDone(id: string, result?: any): void {
  updateJob(id, { status: 'done', result })
}

export function setJobError(id: string, error: string): void {
  updateJob(id, { status: 'error', error })
}

export function getJob(id: string): JobStatus | null {
  return jobs.get(id) || null
}

export function deleteJob(id: string): void {
  jobs.delete(id)
}
