"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  submitFeedback,
  type FeedbackFormState,
} from "@/app/actions/feedback";
import { pick, type Lang } from "@/lib/language-context";

const initialState: FeedbackFormState = { status: "idle" };

function StarRating({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[var(--sindibad-ink)]">
        {label}
      </p>
      <input type="hidden" name={name} value={value} />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className={`text-3xl transition ${
              star <= value
                ? "text-[var(--sindibad-maroon)]"
                : "text-[var(--sindibad-line)]"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackForm({ lang }: { lang: Lang }) {
  const [state, formAction, pending] = useActionState(
    submitFeedback,
    initialState
  );
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [enteredDraw, setEnteredDraw] = useState(false);

  if (state.status === "success") {
    return (
      <div className="rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] p-6 text-center">
        <p className="font-display text-xl text-[var(--sindibad-maroon)]">
          {pick(lang, "شكراً لكم!", "Merci !")}
        </p>
        <p className="mt-1 text-sm text-[var(--sindibad-muted)]">
          {pick(
            lang,
            "رأيكم يساعدنا على التحسن دائماً",
            "Votre avis nous aide à nous améliorer."
          )}
        </p>
        {state.enteredDraw && (
          <p className="mt-4 rounded-md bg-[var(--sindibad-rose)]/20 px-4 py-3 text-sm text-[var(--sindibad-maroon)]">
            {pick(
              lang,
              "🎉 تم تسجيلكم في سحب هذا الأسبوع! سنتصل بكم إذا فزتم.",
              "🎉 Vous êtes inscrit(e) au tirage de cette semaine ! Nous vous appellerons si vous gagnez."
            )}
          </p>
        )}
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-[var(--sindibad-maroon)] underline underline-offset-4"
        >
          {pick(lang, "العودة للرئيسية", "Retour à l'accueil")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div>
        <label
          htmlFor="tableNumber"
          className="mb-2 block text-sm font-medium text-[var(--sindibad-ink)]"
        >
          {pick(lang, "رقم الطاولة", "Numéro de table")}
        </label>
        <input
          id="tableNumber"
          name="tableNumber"
          type="text"
          required
          maxLength={20}
          placeholder={pick(lang, "مثال: 12", "ex. 12")}
          className="w-full rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-3 text-base focus:border-[var(--sindibad-maroon)] focus:outline-none"
        />
      </div>

      <StarRating
        name="foodRating"
        label={pick(lang, "كيف كان الطعام؟", "Comment était le repas ?")}
        value={foodRating}
        onChange={setFoodRating}
      />

      <StarRating
        name="serviceRating"
        label={pick(lang, "كيف كانت الخدمة؟", "Comment était le service ?")}
        value={serviceRating}
        onChange={setServiceRating}
      />

      <div>
        <label
          htmlFor="comment"
          className="mb-2 block text-sm font-medium text-[var(--sindibad-ink)]"
        >
          {pick(
            lang,
            "أي ملاحظات إضافية؟ (اختياري)",
            "Un commentaire à ajouter ? (optionnel)"
          )}
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          maxLength={1000}
          className="w-full rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-3 text-base focus:border-[var(--sindibad-maroon)] focus:outline-none"
        />
      </div>

      <div className="rounded-md border border-[var(--sindibad-rose)]/60 bg-[var(--sindibad-rose)]/10 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="enteredDraw"
            checked={enteredDraw}
            onChange={(e) => setEnteredDraw(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--sindibad-maroon)]"
          />
          <span className="text-sm text-[var(--sindibad-ink)]">
            <span className="font-display block text-base text-[var(--sindibad-maroon)]">
              {pick(
                lang,
                "🎁 شاركوا في السحب الأسبوعي!",
                "🎁 Participez au tirage de la semaine !"
              )}
            </span>
            {pick(
              lang,
              "كل أسبوع نختار عميلاً محظوظاً ليحصل على وجبة كاملة مجانية.",
              "Chaque semaine, un client tiré au sort remporte un repas complet gratuit."
            )}
          </span>
        </label>

        {enteredDraw && (
          <div className="mt-3">
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-[var(--sindibad-ink)]"
            >
              {pick(lang, "رقم الهاتف", "Numéro de téléphone")}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required={enteredDraw}
              maxLength={20}
              placeholder={pick(lang, "0600000000", "0600000000")}
              className="w-full rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-3 text-base focus:border-[var(--sindibad-maroon)] focus:outline-none"
            />
            <p className="mt-1 text-xs text-[var(--sindibad-muted)]">
              {pick(
                lang,
                "سنستخدم هذا الرقم فقط للتواصل معكم في حال الفوز.",
                "Ce numéro ne sera utilisé que pour vous contacter en cas de victoire."
              )}
            </p>
          </div>
        )}
      </div>

      {state.status === "error" && (
        <p className="text-sm text-red-700">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending || foodRating === 0 || serviceRating === 0}
        className="font-display rounded-md bg-[var(--sindibad-ink)] px-6 py-4 text-lg tracking-wide text-[var(--sindibad-cream)] transition hover:bg-[var(--sindibad-maroon)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending
          ? pick(lang, "جارٍ الإرسال...", "Envoi...")
          : pick(lang, "إرسال الرأي", "Envoyer")}
      </button>
    </form>
  );
}
