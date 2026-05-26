export interface LinkSocial {
  type: 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'other'
  url: string
  handle: string
  isPublic: boolean
}

export type ItemEventType = 'player' | 'team' | 'tournament'

export interface ItemEvent {
  id: string
  name: string
  logo: string
  description: string
  linkSocial: LinkSocial[]
  level: number
  parentId: string | null
  type: ItemEventType
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ItemEventWithChildren extends ItemEvent {
  children?: ItemEvent[]
}
