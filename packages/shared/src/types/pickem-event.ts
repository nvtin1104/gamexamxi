export interface PickemEvent {
  id: string
  title: string
  thumbnail: string
  description: string
  winPoints: number
  pickPoints: number
  winExp: number
  pickExp: number
  eventDate: string
  closePicksAt: string
  maxPickItems: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PickemEventOption {
  id: string
  eventId: string
  eventItemId: string
  isWinningOption: number
}

export interface PickemEventPick {
  id: string
  userId: string
  eventId: string
  optionId: string
  pickedAt: string
}

export interface PickemEventWithOptions extends PickemEvent {
  options?: PickemEventOption[]
}

export interface PickemEventOptionWithItem extends PickemEventOption {
  itemName?: string
  itemLogo?: string
}
