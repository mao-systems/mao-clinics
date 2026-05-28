import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { PageContainer } from '@/components/layout/PageContainer'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />

        <PageContainer>
          <Outlet />
        </PageContainer>
      </div>
    </div>
  )
}
