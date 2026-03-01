"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { TEMPLATES, type TemplateCategory, type PromptTemplate } from "@grimoire/shared"
import { cn } from "@/lib/utils"
import * as LucideIcons from "lucide-react"

const CATEGORIES: { key: TemplateCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "social", label: "Social" },
  { key: "thread", label: "Thread" },
  { key: "blog", label: "Blog" },
  { key: "email", label: "Email" },
]

interface TemplatePickerProps {
  selected: PromptTemplate | null
  onSelect: (template: PromptTemplate) => void
}

export function TemplatePicker({ selected, onSelect }: TemplatePickerProps) {
  const [category, setCategory] = useState<TemplateCategory | "all">("all")
  const [search, setSearch] = useState("")

  const filtered = TEMPLATES.filter((t) => {
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
          const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[template.icon]
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
      </div>
    </div>
  )
}
