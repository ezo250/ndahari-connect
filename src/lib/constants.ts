export const CATEGORIES = [
  { id: "driver", emoji: "🚗" },
  { id: "private_driver", emoji: "🚙" },
  { id: "motari", emoji: "🏍️" },
  { id: "bartender", emoji: "🍸" },
  { id: "barista", emoji: "☕" },
  { id: "chef", emoji: "👨‍🍳" },
  { id: "waiter", emoji: "🍽️" },
  { id: "houseboy_girl", emoji: "🏠" },
  { id: "nanny", emoji: "👶" },
  { id: "barber", emoji: "💈" },
  { id: "dry_cleaner", emoji: "👔" },
  { id: "car_washer", emoji: "🚿" },
  { id: "phone_computer_repair", emoji: "📱" },
  { id: "mechanic", emoji: "🔧" },
  { id: "electrician", emoji: "⚡" },
  { id: "plumber", emoji: "🔩" },
  { id: "tailor", emoji: "🧵" },
  { id: "gardener", emoji: "🌿" },
  { id: "security_guard", emoji: "🛡️" },
  { id: "cleaner", emoji: "🧹" },
] as const;

export const LICENSE_CATEGORIES = ["A", "B", "C", "D", "E", "F"] as const;

export const DRIVER_CATEGORY_IDS = ["driver", "private_driver", "motari"] as const;
export const isDriver = (id: string) => DRIVER_CATEGORY_IDS.includes(id as (typeof DRIVER_CATEGORY_IDS)[number]);

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
