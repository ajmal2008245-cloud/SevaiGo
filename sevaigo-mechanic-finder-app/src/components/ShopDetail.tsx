"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Check, Clock3, Heart, MapPin, MessageCircle, Navigation, Phone, Share2, ShieldCheck, Star, X } from "lucide-react";
import type { PublicUser } from "@/lib/auth";
import type { MechanicView } from "@/lib/mechanic-shared";
import { t, type Language } from "@/lib/copy";
import { formatDistance } from "@/components/ShopCard";
import { formatPhoneDisplay, getTelUri } from "@/lib/phone";

export type ShopReview = { id: string; name: string; rating: number; comment: string; createdAt: string };

type Props = {
  shop: MechanicView;
  language: Language;
  isSaved: boolean;
  user: PublicUser | null;
  reviews: ShopReview[];
  reviewSubmitting: boolean;
  onClose: () => void;
  onFavorite: (shop: MechanicView) => void;
  onCall: (shop: MechanicView) => void;
  onNavigate: (shop: MechanicView) => void;
  onShare: (shop: MechanicView) => void;
  onSubmitReview: (rating: number, comment: string) => Promise<boolean>;
  onAuth: () => void;
};

export default function ShopDetail({ shop, language, isSaved, user, reviews, reviewSubmitting, onClose, onFavorite, onCall, onNavigate, onShare, onSubmitReview, onAuth }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = oldOverflow; };
  }, []);

  const status = !shop.isOpen ? "closed" : shop.availabilityStatus === "busy" ? "busy" : "free";
  const statusText = status === "closed" ? t(language, "currentlyClosed") : status === "busy" ? t(language, "busyNow") : t(language, "freeNow");
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}&travelmode=driving`;
  const message = encodeURIComponent(`${shop.shopName} — ${shop.address}. Call: ${shop.phone}. Directions: ${directionsUrl}`);
  const hours = shop.openTime === "00:00" && shop.closeTime === "23:59" ? t(language, "allDay") : `${shop.openTime} – ${shop.closeTime}`;

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (comment.trim().length < 3) { setReviewError("Please write a short review."); return; }
    setReviewError("");
    const success = await onSubmitReview(rating, comment.trim());
    if (success) setComment("");
  }

  return (
    <div className="detail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="detail-sheet" role="dialog" aria-modal="true" aria-label={`${shop.shopName} details`}>
        <div className="detail-mobile-handle" />
        <div className="detail-scroll">
          <div className="detail-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shop.photos[0] || "/images/workshop-1.jpg"} alt={`${shop.shopName} workshop`} />
            <div className="detail-cover-shade" />
            <button className="detail-close" onClick={onClose} aria-label={t(language, "close")}><X size={20} /></button>
            <button className={`detail-heart ${isSaved ? "is-saved" : ""}`} onClick={() => onFavorite(shop)} aria-label={isSaved ? t(language, "saved") : t(language, "save")}><Heart size={20} fill={isSaved ? "currentColor" : "none"} /></button>
            {shop.photos.length > 1 && <div className="detail-photo-count">+ {shop.photos.length - 1} photo</div>}
          </div>

          <div className="detail-content">
            <div className="detail-status-row"><span className={`availability-label ${status}`}><span className="availability-dot" />{statusText}</span><span className="detail-distance"><Navigation size={13} /> {formatDistance(shop.distanceKm)} {t(language, "away")}</span></div>
            <h2 className="detail-title">{shop.shopName}</h2>
            <div className="detail-rating">
              <span><Star size={16} fill="currentColor" /> {shop.rating.toFixed(1)}</span>
              <span className="detail-rating-count">({shop.reviewCount} reviews)</span>
              <span className="detail-verified"><BadgeCheck size={15} />{t(language, "verified")}</span>
              {shop.isRegisteredOwner && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "rgba(21, 147, 103, 0.12)",
                    color: "#159367",
                    fontSize: "0.72rem",
                    fontWeight: "800",
                    padding: "2px 8px",
                    borderRadius: "6px",
                  }}
                >
                  <ShieldCheck size={13} strokeWidth={2.4} /> SEVAIGO Partner
                </span>
              )}
            </div>
            <p className="detail-address"><MapPin size={16} />{shop.address}{shop.city ? `, ${shop.city}` : ""}{shop.pincode ? ` - ${shop.pincode}` : ""}</p>

            <div className="detail-stat-grid">
              <div><Clock3 size={17} /><span><small>{t(language, "workingHours")}</small><strong>{hours}{shop.workingDays && shop.workingDays.length > 0 ? ` (${shop.workingDays.join(", ")})` : ""}</strong></span></div>
              <div><Navigation size={17} /><span><small>Estimated arrival</small><strong>{shop.etaMinutes} {t(language, "minutesAway")}</strong></span></div>
            </div>

            <div className="detail-section">
              <h3>{t(language, "meetMechanic")}</h3>
              <div className="owner-profile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shop.ownerPhoto || "/images/owner-1.jpg"} alt={shop.ownerName} />
                <div><strong>{shop.ownerName}</strong><span>{shop.yearsExperience} {t(language, "experience")}</span></div>
                <span className="owner-check"><ShieldCheck size={17} /></span>
              </div>
            </div>

            <div className="detail-section">
              <h3>{t(language, "specialties")}</h3>
              <div className="detail-tags">{shop.specializations.map((item) => <span key={item}><Check size={13} />{item}</span>)}</div>
            </div>

            <div className="detail-price"><div><span>{t(language, "priceGuide")}</span><strong>₹{shop.priceMin.toLocaleString("en-IN")} – ₹{shop.priceMax.toLocaleString("en-IN")}</strong></div><span>Service dependent</span></div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "12px", padding: "12px 16px", margin: "16px 0", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "0.74rem", fontWeight: "800", color: "var(--muted-dark)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Verified Workshop Contact</div>
                <div style={{ fontSize: "1.15rem", fontWeight: "900", color: "var(--heading)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Phone size={18} style={{ color: "#16a34a" }} />
                  <span>{formatPhoneDisplay(shop.phone)}</span>
                </div>
              </div>
              <a
                href={getTelUri(shop.phone) || "#"}
                onClick={(e) => {
                  e.preventDefault();
                  onCall(shop);
                }}
                style={{
                  background: "#16a34a",
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "800",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <Phone size={14} /> Call Now
              </a>
            </div>

            <div className="detail-share-row">
              <button onClick={() => onShare(shop)}><Share2 size={16} />{t(language, "share")}</button>
              <a href={`https://wa.me/?text=${message}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} />{t(language, "whatsapp")}</a>
              <a href={`sms:?body=${message}`}><ArrowRight size={16} />{t(language, "sms")}</a>
            </div>

            <div className="detail-section review-section">
              <div className="review-heading"><h3>{t(language, "reviewHeading")}</h3><span><Star size={14} fill="currentColor" /> {shop.rating.toFixed(1)}</span></div>
              {reviews.length ? <div className="review-list">{reviews.map((review) => <div className="review-item" key={review.id}><div className="review-item-top"><span className="review-avatar">{review.name.slice(0, 1).toUpperCase()}</span><div><strong>{review.name}</strong><small>{new Date(review.createdAt).toLocaleDateString(language === "ta" ? "ta-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })}</small></div><span className="review-stars"><Star size={13} fill="currentColor" /> {review.rating}</span></div><p>{review.comment}</p></div>)}</div> : <p className="detail-muted">{t(language, "noReviews")}</p>}
              <h4>{t(language, "leaveReview")}</h4>
              {user ? <form className="review-form" onSubmit={submitReview}><div className="star-input">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} stars`}><Star size={25} fill={value <= rating ? "currentColor" : "none"} /></button>)}</div><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t(language, "writeReview")} rows={3} maxLength={500} />{reviewError && <p className="form-error">{reviewError}</p>}<button type="submit" className="review-submit" disabled={reviewSubmitting}>{reviewSubmitting ? "Posting..." : t(language, "submitReview")}</button></form> : <button className="review-login" onClick={onAuth}>{t(language, "loginContinue")} <ArrowRight size={15} /></button>}
            </div>
          </div>
        </div>
        <div className="detail-bottom-actions">
          <a
            href={getTelUri(shop.phone) || "#"}
            onClick={(e) => {
              e.preventDefault();
              onCall(shop);
            }}
            className="detail-call-button"
          >
            <Phone size={19} fill="currentColor" />
            {t(language, "callNow")}
          </a>
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => onNavigate(shop)} className="detail-navigate-button">
            <Navigation size={19} fill="currentColor" />
            {t(language, "navigate")}
          </a>
        </div>
      </aside>
    </div>
  );
}
