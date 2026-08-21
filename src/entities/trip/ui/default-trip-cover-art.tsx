import Image from "next/image";

import { getDefaultTripCoverImageUrl } from "@/entities/trip/lib/default-trip-cover-image";

type DefaultTripCoverArtProps = {
  className?: string;
  sizes?: string;
  tripId?: string;
};

/** The shared photo cover used until a trip owner uploads a cover photo. */
export function DefaultTripCoverArt({
  className,
  sizes = "(max-width: 700px) 100vw, 50vw",
  tripId = "tripmate-default-cover",
}: DefaultTripCoverArtProps) {
  return (
    <div aria-hidden="true" className={`default-trip-cover-art${className ? ` ${className}` : ""}`}>
      <Image
        alt=""
        className="default-trip-cover-art-image"
        fill
        sizes={sizes}
        src={getDefaultTripCoverImageUrl(tripId)}
      />
      <span className="default-trip-cover-art-ticket">TRIP MATE</span>
      <span className="default-trip-cover-art-wordmark">TripMate</span>
      <span className="default-trip-cover-art-caption">YOUR NEXT STORY</span>
    </div>
  );
}
