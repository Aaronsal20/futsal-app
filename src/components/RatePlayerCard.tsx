'use client';
import Player from "@/types/player";

type RatePlayerCardProps = {
  player: Player;
  selected: number;
  onRate: (playerId:number, rating: number) => void;
  onRatingChange: (playerId: number, score: number) => void;
};

export default function RatePlayerCard({ player, selected, onRate }: RatePlayerCardProps) {
  return (
    <div className="flex items-center space-x-4 border p-4 rounded">
      <img
        src={player.avatar_url || 'https://via.placeholder.com/40'}
        alt={player.name}
        className="w-16 h-16 rounded-full"
      />
      <div className="flex-1">
        <div className="font-medium">{player.name}</div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => onRate(player.id, num)}
              className={`w-8 h-8 rounded-full text-sm flex items-center justify-center
                border border-gray-300 
                ${selected === num ? 'bg-blue-600 text-white' : 'bg-gray-100'}
              `}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}