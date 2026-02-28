export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}

export type NavItem = {
  title: string
  href: string
  icon: string
  disabled?: boolean
  badge?: string
}
