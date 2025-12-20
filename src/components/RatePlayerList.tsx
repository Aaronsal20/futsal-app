import { useState } from "react";
import { supabase } from "@/lib/supabaseAdmin";
import RatePlayerCard from "@/components/RatePlayerCard";
import Player from "@/types/player";

export default function RatePlayerList({ players }: { players: Player[] }) {
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const handleRatingChange = (playerId: number, score: number) => {
    setRatings((prevRatings) => ({
      ...prevRatings,
      [playerId]: score,
    }));
  };

  const handleSubmit = async () => {
    const playerRatings = Object.entries(ratings).map(([playerId, score]) => ({
      player_id: playerId,
      score,
    }));

    const { error } = await supabase.from("player_ratings").insert(playerRatings);

    if (error) {
      console.error("Error submitting ratings:", error);
    } else {
      alert("Ratings submitted successfully!");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Rate Players</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player) => (
          <RatePlayerCard
            player={player}
            onRatingChange={handleRatingChange}
            selected={ratings[player.id] || 0}
            key={player.id}
            onRate={(playerId, score) => handleRatingChange(playerId, score)}
          />
        ))}
      </div>
      <button
        onClick={handleSubmit}
        className="mt-6 bg-blue-500 text-white p-2 rounded"
      >
        Submit Ratings
      </button>
    </div>
  );
}
