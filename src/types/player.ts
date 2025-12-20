export interface Player {
  id: number;
  name: string;
  avatar_url?: string;
  position?: string; // Optional field, adjust as necessary
};


export interface PlayerWithRating  {
  id: number;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  position?: string; // Optional field, adjust as necessary
  avg_rating: number;
}