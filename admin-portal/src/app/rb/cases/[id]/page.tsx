import CaseDetailView from '@/components/CaseDetailView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RBCaseDetailPage({ params }: Props) {
  const { id } = await params
  return <CaseDetailView caseId={id} bureau="RB" backHref="/rb/dashboard" />
}
