import CaseListView from '@/components/CaseListView'

export const metadata = {
  title: 'PGRC Grievances Queue | AICTE Admin Portal',
  description: 'Public Grievance Redressal Cell case queue and management',
}

export default function PGRCCasesPage() {
  return <CaseListView bureau="PGRC" />
}
