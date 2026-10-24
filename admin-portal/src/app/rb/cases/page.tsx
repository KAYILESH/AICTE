import CaseListView from '@/components/CaseListView'

export const metadata = {
  title: 'RB Cases Queue | AICTE Admin Portal',
  description: 'Regulation Bureau case queue and management',
}

export default function RBCasesPage() {
  return <CaseListView bureau="RB" />
}
