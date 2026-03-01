"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileTab } from "@/components/dashboard/settings/profile-tab"
import { OrganizationTab } from "@/components/dashboard/settings/organization-tab"
import { BillingTab } from "@/components/dashboard/settings/billing-tab"
import { User, Building2, CreditCard } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, organization, and billing
        </p>
      </div>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="h-10 gap-1 rounded-xl bg-muted/50 p-1">
          <TabsTrigger
            value="profile"
            className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-soft"
          >
            <User className="h-3.5 w-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="organization"
            className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-soft"
          >
            <Building2 className="h-3.5 w-3.5" />
            Organization
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-soft"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Billing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="organization" className="mt-6">
          <OrganizationTab />
        </TabsContent>
        <TabsContent value="billing" className="mt-6">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
