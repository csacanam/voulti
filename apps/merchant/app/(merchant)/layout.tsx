import { CommerceProvider } from "@/components/providers/commerce-provider"
import { DashboardHeader } from "@/components/dashboard-header"
import { CommerceRegistrationModal } from "@/components/commerce-registration-modal"

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CommerceProvider>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </main>
      </div>
      <CommerceRegistrationModal />
    </CommerceProvider>
  )
}

