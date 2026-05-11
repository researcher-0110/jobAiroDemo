import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchJob } from '@/lib/api/jobs'
import { JobDetailClient } from '@/components/jobs/JobDetailClient'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const job = await fetchJob(params.id)
    return {
      title: `${job.title} at ${job.company}`,
      description: job.description.slice(0, 160),
      openGraph: {
        title: `${job.title} at ${job.company}`,
        description: job.description.slice(0, 160),
      },
    }
  } catch {
    return { title: 'Job not found' }
  }
}

export default async function JobDetailPage({ params }: PageProps) {
  let job
  try {
    job = await fetchJob(params.id)
  } catch {
    notFound()
  }

  return <JobDetailClient job={job} />
}
