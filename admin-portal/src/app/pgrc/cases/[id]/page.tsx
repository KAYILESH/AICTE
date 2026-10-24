import CaseDetailView from '@/components/CaseDetailView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PGRCCaseDetailPage({ params }: Props) {
  const { id } = await params
  return <CaseDetailView caseId={id} bureau="PGRC" backHref="/pgrc/dashboard" />
}
