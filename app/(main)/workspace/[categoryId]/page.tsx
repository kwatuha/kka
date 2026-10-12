import { WorkspaceHome } from "@/components/workspace-home"
import { navigationCategories } from "@/lib/navigation"
import { notFound } from "next/navigation"

interface WorkspacePageProps {
  params: Promise<{ categoryId: string }>
}

export function generateStaticParams() {
  return navigationCategories.map((c) => ({ categoryId: c.id }))
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { categoryId } = await params
  const exists = navigationCategories.some((c) => c.id === categoryId)
  if (!exists) {
    notFound()
  }
  return <WorkspaceHome categoryId={categoryId} />
}
