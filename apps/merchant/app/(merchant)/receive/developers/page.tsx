"use client"

import { useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Code, Lock, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DevelopersPage() {
  const { authenticated } = usePrivy()
  const { toast } = useToast()
  const [email, setEmail] = useState("")

  const handleNotifyMe = () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "You're on the list!",
      description: "We'll notify you when the API is ready",
    })
    setEmail("")
  }

  if (!authenticated) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Lock className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-sm">Please login to access developer features</p>
          </div>
        </div>
      </Card>
    )
  }

  const features = [
    "Create payment links programmatically",
    "Receive webhooks for payment events",
    "Manage API keys and secrets",
    "Full REST API documentation",
    "SDK libraries for popular languages",
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Developers</h1>
        <p className="text-muted-foreground">API & Webhooks integration</p>
      </div>

      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <Code className="w-10 h-10 text-primary" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-3">API & Webhooks Coming Soon</h2>
            <p className="text-muted-foreground mb-6">
              We're building powerful developer tools to help you integrate Voulti into your applications.
            </p>
          </div>

          <Card className="p-6 bg-muted/50 w-full text-left">
            <h3 className="font-semibold text-foreground mb-4">You'll be able to:</h3>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="w-full">
            <h3 className="font-semibold text-foreground mb-3">Get notified when it's ready</h3>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleNotifyMe}>Notify Me</Button>
            </div>
          </div>

          <div className="pt-4">
            <Button variant="outline" disabled>
              View API Docs (Coming Soon)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}




