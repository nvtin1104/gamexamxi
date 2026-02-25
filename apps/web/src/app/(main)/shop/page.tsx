'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { shopApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatPoints } from '@/lib/utils'
import type { ShopItem } from '@gamexamxi/shared'

export default function ShopPage() {
  const { token, user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<string | undefined>(undefined)

  const { data, isLoading } = useQuery({
    queryKey: ['shop', category],
    queryFn: () => shopApi.list(token!, category),
    enabled: !!token,
  })

  const purchaseMutation = useMutation({
    mutationFn: (itemId: string) => shopApi.purchase(itemId, token!),
    onSuccess: (result: unknown) => {
      const res = result as { data?: { newPoints?: number }; ok: boolean }
      if (res.data?.newPoints !== undefined) {
        updateUser({ points: res.data.newPoints })
      }
      queryClient.invalidateQueries({ queryKey: ['shop'] })
    },
  })

  const items = (data?.data ?? []) as ShopItem[]
  const categories = ['AVATAR_FRAME', 'BADGE', 'THEME', 'BOOST', 'EMOTE']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-lg text-dark">SHOP</h1>
        <div className="card-brutal bg-secondary p-3">
          <span className="font-display text-xl text-dark">
            {formatPoints(user?.points ?? 0)} PTS
          </span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(undefined)}
          className={`btn-brutal text-xs px-3 py-2 ${!category ? 'bg-dark text-white' : 'bg-surface text-dark'}`}
        >
          ALL
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`btn-brutal text-xs px-3 py-2 ${category === cat ? 'bg-dark text-white' : 'bg-surface text-dark'}`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-brutal bg-surface p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const canAfford = (user?.points ?? 0) >= item.price
            return (
              <Card key={item.id} className="bg-surface flex flex-col">
                {/* Item Preview */}
                <div className="bg-bg border-b border-dark/10 p-6 flex items-center justify-center text-4xl">
                  {item.category === 'AVATAR_FRAME' ? '🖼️'
                    : item.category === 'BADGE' ? '🏅'
                    : item.category === 'THEME' ? '🎨'
                    : item.category === 'BOOST' ? '⚡'
                    : '✨'}
                </div>

                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-mono text-sm font-bold text-dark leading-tight">{item.name}</h3>
                    {item.isLimited && (
                      <Badge variant="danger" className="text-[10px] ml-1 flex-shrink-0">LIMITED</Badge>
                    )}
                  </div>

                  {item.description && (
                    <p className="font-mono text-xs text-muted mb-3 line-clamp-2">{item.description}</p>
                  )}

                  <div className="mt-auto pt-3 border-t border-dark/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display text-xl text-primary">{item.price}</span>
                      {item.stock !== null && (
                        <span className="font-mono text-xs text-muted">{item.stock} left</span>
                      )}
                    </div>
                    <Button
                      variant={canAfford ? 'primary' : 'ghost'}
                      size="sm"
                      fullWidth
                      disabled={!canAfford}
                      loading={purchaseMutation.isPending && purchaseMutation.variables === item.id}
                      onClick={() => purchaseMutation.mutate(item.id)}
                    >
                      {canAfford ? 'BUY' : 'NOT ENOUGH'}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
