import { users } from './users'
import { permissionGroups } from './permission-groups'
import { userPermissions } from './user_permissions'
import { userPoints } from './user-points'
import { pointTransactions } from './point-transactions'
import { userStats } from './user-stats'
import { itemEvents } from './events/item-events'
import { pickemEvents, pickemEventOptions, pickemEventPicks } from './events/pickem-events'
import { media } from './media'

export { 
    users, 
    permissionGroups, 
    userPermissions, 
    userPoints, 
    pointTransactions, 
    userStats, 
    itemEvents, 
    pickemEvents, 
    pickemEventOptions, 
    pickemEventPicks,
    media 
}

export const schema = {
    users,
    permissionGroups,
    userPermissions,
    userPoints,
    pointTransactions,
    userStats,
    itemEvents,
    pickemEvents,
    pickemEventOptions,
    pickemEventPicks,
    media,
}
