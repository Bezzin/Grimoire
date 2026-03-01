"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { TEMPLATES, type TemplateCategory, type PromptTemplate } from "@grimoire/shared"
import { cn } from "@/lib/utils"
import * as LucideIcons from "lucide-react"
import { trpc } from "@/lib/trpc/client"

const CATEGORIES: { key: TemplateCategory | "all" | "custom"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "social", label: "Social" },
  { key: "thread", label: "Thread" },
  { key: "blog", label: "Blog" },
  { key: "email", label: "Email" },
  { key: "custom", label: "Custom" },
]

interface TemplatePickerProps {
  selected: PromptTemplate | null
  onSelect: (template: PromptTemplate) => void
  onSelectCustom: (template: { id: string; name: string; category: string; tier: string; inputFields: unknown; systemPrompt: string }) => void
}

export function TemplatePicker({ selected, onSelect, onSelectCustom }: TemplatePickerProps) {
  const [category, setCategory] = useState<TemplateCategory | "all" | "custom">("all")
  const [search, setSearch] = useState("")

  const { data: customTemplates } = trpc.customTemplate.list.useQuery()

  const filtered = TEMPLATES.filter((t) => {
    if (category === "custom") return false
    if (category !== "all" && t.category !== category) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex h-full flex-col border-r border-border/50">
      <div className="border-b border-border/50 p-3">
        <h2 className="mb-2 text-sm font-semibold">Templates</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 border-b border-border/50 px-3 py-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              category === cat.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.map((template) => {
          const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[template.icon]
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                selected?.id === template.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/30"
              )}
            >
              {IconComponent && (
                <IconComponent className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{template.name}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              </div>
            </button>
          )
        })}
        {(category === "all" || category === "custom") && customTemplates?.map((ct) => (
          <button
            key={`custom:${ct.id}`}
            onClick={() => onSelectCustom(ct)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
              "hover:bg-muted/30"
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium leading-tight">{ct.name}</p>
                <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary">Custom</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground line-clamp-2">
                {ct.description ?? ct.category}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
