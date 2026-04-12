import { CommerceProvider } from "@/components/providers/commerce-provider"
import { DashboardHeader } from "@/components/dashboard-header"
import { BottomNav } from "@/components/bottom-nav"
import { CommerceRegistrationModal } from "@/components/commerce-registration-modal"
import { Footer } from "@/components/footer"

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CommerceProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl flex-1 pb-24 sm:pb-8">
          {children}
        </main>
        <Footer />
      </div>
      <BottomNav />
      <CommerceRegistrationModal />
    </CommerceProvider>
  )
}
