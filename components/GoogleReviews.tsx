import { Review } from "@/lib/types";

const GOOGLE_MAPS_URL =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL ||
  "https://www.google.com/maps/place/Mayur+Masala+Center+and+Pooja+Bhandar/@18.6223338,73.649168,12z/data=!4m6!3m5!1s0x3bc2b9c64ee491bd:0x1b2772fad6e477e1!8m2!3d18.6223157!4d73.8015853";

const WRITE_REVIEW_URL =
  process.env.NEXT_PUBLIC_GOOGLE_WRITE_REVIEW_URL ||
  "https://search.google.com/local/writereview?placeid=0x3bc2b9c64ee491bd:0x1b2772fad6e477e1";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="text-turmeric-500 text-sm tracking-wide" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </div>
  );
}

export default function GoogleReviews({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-vermillion-500 mb-1">
            Verified on Google
          </p>
          <h2 className="font-display text-3xl text-tamarind-900">What Our Customers Say</h2>
        </div>
        <div className="flex gap-3">
          <a
            href={WRITE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold border border-tamarind-900/20 hover:border-vermillion-500 hover:text-vermillion-500 transition-colors px-4 py-2 rounded-full"
          >
            Write a Review
          </a>
          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold bg-vermillion-500 hover:bg-vermillion-400 text-cream transition-colors px-4 py-2 rounded-full"
          >
            See All Reviews
          </a>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white/70 border border-turmeric-300/30 rounded-2xl p-5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <Stars rating={review.rating} />
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.85z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z"
                />
              </svg>
            </div>
            <p className="text-sm text-tamarind-800/80 flex-1">&ldquo;{review.review_text}&rdquo;</p>
            <div className="mt-4 flex items-center justify-between text-xs text-tamarind-800/50">
              <span className="font-semibold text-tamarind-900">{review.author_name}</span>
              {review.review_date && (
                <span>{new Date(review.review_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
