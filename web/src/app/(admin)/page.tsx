import { redirect } from "next/navigation";

// The vehicle-condition dashboard will live here; until then, land on reviews.
export default function Home() {
  redirect("/reviews");
}
