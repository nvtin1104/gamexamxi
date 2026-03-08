import { Header, Footer } from '@/components/layout';
import { Hero, GameCard } from '@/components/home';

const games = [
  { title: 'Word Game', icon: '📝', players: 8420, difficulty: 'easy' as const, thumbnail: 'sage' as const, href: '/game/word' },
  { title: 'Puzzle Block', icon: '🧩', players: 5230, difficulty: 'medium' as const, thumbnail: 'peach' as const, href: '/game/puzzle' },
  { title: 'Quiz Master', icon: '🧠', players: 9100, difficulty: 'easy' as const, thumbnail: 'sky' as const, href: '/game/quiz' },
  { title: 'Memory Match', icon: '🎴', players: 3150, difficulty: 'medium' as const, thumbnail: 'lilac' as const, href: '/game/memory' },
  { title: 'Math Speed', icon: '🔢', players: 6780, difficulty: 'hard' as const, thumbnail: 'butter' as const, href: '/game/math' },
  { title: 'Word Chain', icon: '🔗', players: 4290, difficulty: 'medium' as const, thumbnail: 'warm' as const, href: '/game/chain' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--color-cream)' }}>
      <Header />
      
      <main className="flex-1 px-5 max-w-6xl mx-auto w-full">
        <Hero />
        
        <section className="py-10">
          <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl mb-6">
            📚 Game của chúng tôi
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map((game) => (
              <GameCard key={game.href} {...game} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
